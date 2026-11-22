// src/services/whatsappWebhook.service.ts

import { getFirebaseAdmin } from '@/lib/firebase/admin';
import {
  WebhookPayload,
  WebhookEntry,
  WebhookChangeValue,
  WebhookIncomingMessage,
  WebhookStatus,
  WhatsAppWebhookEvent,
  WhatsAppWebhookEventInput,
  WebhookEventType,
  MessageStatus,
} from '@/types/whatsappWebhook.types';

const WEBHOOK_EVENTS_COLLECTION = 'whatsappWebhookEvents';

// ==========================================
// UTILIDADES DE PARSEO
// ==========================================

/**
 * Determina el tipo de evento basado en el contenido del change value.
 */
function determineEventType(value: WebhookChangeValue): WebhookEventType {
  if (value.messages && value.messages.length > 0) {
    return 'message_received';
  }
  if (value.statuses && value.statuses.length > 0) {
    const firstStatus = value.statuses[0];
    if (firstStatus.errors && firstStatus.errors.length > 0) {
      return 'message_failed';
    }
    switch (firstStatus.status) {
      case 'sent':
        return 'message_sent';
      case 'delivered':
        return 'message_delivered';
      case 'read':
        return 'message_read';
      case 'failed':
        return 'message_failed';
      case 'deleted':
        return 'message_received'; // treated as user action
      default:
        return 'unknown';
    }
  }
  if (value.errors && value.errors.length > 0) {
    return 'message_failed';
  }
  return 'unknown';
}

/**
 * Extrae el texto legible de un mensaje entrante según su tipo.
 */
function extractMessageText(message: WebhookIncomingMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'interactive':
      if (message.interactive?.type === 'button_reply') {
        return `[Botón] ${message.interactive.button_reply?.title || ''}`;
      }
      if (message.interactive?.type === 'list_reply') {
        return `[Lista] ${message.interactive.list_reply?.title || ''}`;
      }
      return '[Mensaje interactivo]';
    case 'button':
      return `[Botón] ${message.button?.text || ''}`;
    case 'image':
      return '[Imagen recibida]';
    case 'video':
      return '[Video recibido]';
    case 'audio':
      return '[Audio recibido]';
    case 'document':
      return '[Documento recibido]';
    case 'location':
      return '[Ubicación recibida]';
    case 'contacts':
      return '[Contacto compartido]';
    case 'reaction':
      return '[Reacción]';
    case 'unsupported':
      return '[Tipo de mensaje no soportado]';
    default:
      return '';
  }
}

/**
 * Busca el tenantId correspondiente al Phone Number ID del evento.
 * Retorna null si no encuentra un tenant configurado.
 */
async function findTenantByPhoneNumber(phoneNumberId: string): Promise<string | null> {
  const { db } = getFirebaseAdmin();

  // Buscar tenant que tenga este phoneNumberId configurado
  const tenantsSnapshot = await db.collection('tenants').get();
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantData = tenantDoc.data();
    if (tenantData?.whatsappPhoneNumberId === phoneNumberId) {
      return tenantDoc.id;
    }
  }

  // Fallback: usar el tenant de la variable de entorno si existe
  const defaultTenantId = process.env.WHATSAPP_DEFAULT_TENANT_ID;
  if (defaultTenantId) {
    return defaultTenantId;
  }

  return null;
}

// ==========================================
// SERVICIO PRINCIPAL
// ==========================================

export const whatsappWebhookService = {
  /**
   * Procesa el payload completo de Meta (puede contener múltiples eventos).
   * Retorna el número de eventos procesados exitosamente.
   */
  async processPayload(payload: WebhookPayload): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (payload.object !== 'whatsapp_business_account') {
      result.errors.push(`Objeto no reconocido: ${payload.object}`);
      return result;
    }

    for (const entry of payload.entry) {
      const entryResult = await this.processEntry(entry);
      result.processed += entryResult.processed;
      result.failed += entryResult.failed;
      result.errors.push(...entryResult.errors);
    }

    return result;
  },

  /**
   * Procesa una entrada (entry) del webhook, que puede tener múltiples changes.
   */
  async processEntry(entry: WebhookEntry): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const change of entry.changes) {
      if (change.field !== 'messages') {
        continue;
      }

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      if (!phoneNumberId) {
        result.errors.push('Evento sin phone_number_id');
        result.failed++;
        continue;
      }

      // Buscar el tenant correspondiente
      const tenantId = await findTenantByPhoneNumber(phoneNumberId);
      if (!tenantId) {
        result.errors.push(`No se encontró tenant para phoneNumberId: ${phoneNumberId}`);
        result.failed++;
        continue;
      }

      // Procesar mensajes entrantes
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          try {
            const contact = value.contacts?.find(c => c.wa_id === message.from);
            await this.saveMessageReceived(tenantId, value, message, contact?.profile.name);
            result.processed++;
          } catch (err) {
            result.failed++;
            const message = err instanceof Error ? err.message : 'Error desconocido';
            result.errors.push(`Error procesando mensaje ${message}: ${message}`);
          }
        }
      }

      // Procesar statuses (delivered, read, failed, etc.)
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          try {
            await this.saveStatusEvent(tenantId, value, status);
            result.processed++;
          } catch (err) {
            result.failed++;
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            result.errors.push(`Error procesando status ${status.id}: ${errorMessage}`);
          }
        }
      }

      // Procesar errores globales del entry
      if (value.errors && value.errors.length > 0) {
        for (const error of value.errors) {
          try {
            await this.saveErrorEvent(tenantId, value, error);
            result.processed++;
          } catch (err) {
            result.failed++;
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            result.errors.push(`Error procesando error global: ${errorMessage}`);
          }
        }
      }
    }

    return result;
  },

  /**
   * Guarda un mensaje entrante en Firestore.
   */
  async saveMessageReceived(
    tenantId: string,
    value: WebhookChangeValue,
    message: WebhookIncomingMessage,
    contactName?: string
  ): Promise<void> {
    const event: WhatsAppWebhookEventInput = {
      tenantId,
      eventType: 'message_received',
      messageId: message.id,
      from: message.from,
      messageText: extractMessageText(message),
      messageType: message.type,
      wabaId: value.metadata?.phone_number_id || '',
      phoneNumberId: value.metadata?.phone_number_id || '',
      displayPhoneNumber: value.metadata?.display_phone_number,
      contactName,
      eventTimestamp: new Date(parseInt(message.timestamp, 10) * 1000).toISOString(),
      receivedAt: new Date().toISOString(),
      rawPayload: message,
    };

    await this.saveEvent(tenantId, event);
  },

  /**
   * Guarda un evento de status (delivered, read, sent, failed).
   */
  async saveStatusEvent(
    tenantId: string,
    value: WebhookChangeValue,
    status: WebhookStatus
  ): Promise<void> {
    let eventType: WebhookEventType = 'unknown';
    switch (status.status) {
      case 'sent':
        eventType = 'message_sent';
        break;
      case 'delivered':
        eventType = 'message_delivered';
        break;
      case 'read':
        eventType = 'message_read';
        break;
      case 'failed':
        eventType = 'message_failed';
        break;
    }

    const event: WhatsAppWebhookEventInput = {
      tenantId,
      eventType,
      messageId: status.id,
      to: status.recipient_id,
      status: status.status as MessageStatus,
      conversationId: status.conversation?.id,
      conversationType: status.conversation?.origin?.type,
      wabaId: value.metadata?.phone_number_id || '',
      phoneNumberId: value.metadata?.phone_number_id || '',
      displayPhoneNumber: value.metadata?.display_phone_number,
      eventTimestamp: new Date(parseInt(status.timestamp, 10) * 1000).toISOString(),
      receivedAt: new Date().toISOString(),
      rawPayload: status,
    };

    if (status.errors && status.errors.length > 0) {
      event.errorCode = status.errors[0].code;
      event.errorMessage = status.errors[0].message;
    }

    await this.saveEvent(tenantId, event);
  },

  /**
   * Guarda un error global reportado por Meta.
   */
  async saveErrorEvent(
    tenantId: string,
    value: WebhookChangeValue,
    error: { code: number; title: string; message: string }
  ): Promise<void> {
    const event: WhatsAppWebhookEventInput = {
      tenantId,
      eventType: 'message_failed',
      errorCode: error.code,
      errorMessage: `${error.title}: ${error.message}`,
      wabaId: value.metadata?.phone_number_id || '',
      phoneNumberId: value.metadata?.phone_number_id || '',
      displayPhoneNumber: value.metadata?.display_phone_number,
      eventTimestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      rawPayload: error,
    };

    await this.saveEvent(tenantId, event);
  },

  /**
   * Guarda un evento genérico en Firestore.
   */
  async saveEvent(tenantId: string, event: WhatsAppWebhookEventInput): Promise<void> {
    const { db } = getFirebaseAdmin();
    const eventsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(WEBHOOK_EVENTS_COLLECTION);

    await eventsRef.add(event);
  },
};