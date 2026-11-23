// src/services/whatsappWebhook.service.ts

import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappConversationService } from '@/services/whatsappConversation.service';
import { whatsappMediaService } from '@/services/whatsappMedia.service';
import {
  WebhookPayload,
  WebhookEntry,
  WebhookChangeValue,
  WebhookIncomingMessage,
  WebhookStatus,
  WebhookMediaPayload,
  WhatsAppWebhookEventInput,
  WebhookEventType,
  MessageStatus,
} from '@/types/whatsappWebhook.types';
import {
  OutboundMessageStatus,
  WhatsAppMessageMedia,
  WhatsAppMediaType,
} from '@/types/whatsappConversation.types';

const WEBHOOK_EVENTS_COLLECTION = 'whatsappWebhookEvents';

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
      return message.image?.caption || '[Imagen recibida]';
    case 'video':
      return message.video?.caption || '[Video recibido]';
    case 'audio':
      return '[Audio de voz recibido]';
    case 'document':
      return `[Documento] ${message.document?.filename || 'recibido'}`;
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

function getMediaPayload(
  message: WebhookIncomingMessage
): { payload: WebhookMediaPayload; type: WhatsAppMediaType } | null {
  if (message.image) return { payload: message.image, type: 'image' };
  if (message.audio) return { payload: message.audio, type: 'audio' };
  if (message.video) return { payload: message.video, type: 'video' };
  if (message.document) return { payload: message.document, type: 'document' };
  return null;
}

async function findTenantByPhoneNumber(phoneNumberId: string): Promise<string | null> {
  const { db } = getFirebaseAdmin();
  const tenantsSnapshot = await db.collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantData = tenantDoc.data();
    if (tenantData?.whatsappPhoneNumberId === phoneNumberId) {
      return tenantDoc.id;
    }
  }

  const defaultTenantId = process.env.WHATSAPP_DEFAULT_TENANT_ID;
  if (defaultTenantId) {
    return defaultTenantId;
  }

  return null;
}

export const whatsappWebhookService = {
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

      const tenantId = await findTenantByPhoneNumber(phoneNumberId);
      if (!tenantId) {
        result.errors.push(`No se encontró tenant para phoneNumberId: ${phoneNumberId}`);
        result.failed++;
        continue;
      }

      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          try {
            const contact = value.contacts?.find(c => c.wa_id === message.from);
            await this.saveMessageReceived(tenantId, value, message, contact?.profile.name);
            result.processed++;
          } catch (err) {
            result.failed++;
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            result.errors.push(`Error procesando mensaje: ${errorMessage}`);
          }
        }
      }

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

  async saveMessageReceived(
    tenantId: string,
    value: WebhookChangeValue,
    message: WebhookIncomingMessage,
    contactName?: string
  ): Promise<void> {
    const eventTimestamp = new Date(parseInt(message.timestamp, 10) * 1000).toISOString();
    let text = extractMessageText(message);
    let media: WhatsAppMessageMedia | undefined;

    // Si es multimedia, transferir de Meta a Vercel Blob (URL permanente)
    const mediaInfo = getMediaPayload(message);
    if (mediaInfo) {
      try {
        const pathname = `whatsapp/${tenantId}/${message.id}_${mediaInfo.type}`;
        const transferred = await whatsappMediaService.transferMetaMediaToBlob(
          mediaInfo.payload.id,
          pathname
        );
        media = {
          type: mediaInfo.type,
          mediaFileId: transferred.url,
          mimeType: transferred.contentType,
          sizeBytes: transferred.sizeBytes,
          caption: mediaInfo.payload.caption,
          fileName: mediaInfo.payload.filename,
          metaMediaId: mediaInfo.payload.id,
        };
      } catch (mediaError) {
        console.error('[Webhook] Error transfiriendo media a Blob:', mediaError);
        // Si falla, el mensaje se guarda como texto descriptivo sin media
      }
    }

    const event: WhatsAppWebhookEventInput = {
      tenantId,
      eventType: 'message_received',
      messageId: message.id,
      from: message.from,
      messageText: text,
      messageType: message.type,
      wabaId: value.metadata?.phone_number_id || '',
      phoneNumberId: value.metadata?.phone_number_id || '',
      displayPhoneNumber: value.metadata?.display_phone_number,
      contactName,
      eventTimestamp,
      receivedAt: new Date().toISOString(),
      rawPayload: message,
    };
    await this.saveEvent(tenantId, event);

    const conversationId = await whatsappConversationService.upsertConversation({
      tenantId,
      phoneNumber: message.from,
      contactName,
      direction: 'INBOUND',
      messageText: text,
      messageTimestamp: eventTimestamp,
    });

    await whatsappConversationService.addMessage({
      tenantId,
      conversationId,
      direction: 'INBOUND',
      messageType: message.type,
      text,
      metaMessageId: message.id,
      media,
      timestamp: eventTimestamp,
    });
  },

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

    const trackable: OutboundMessageStatus[] = ['sent', 'delivered', 'read', 'failed'];
    if (trackable.includes(status.status as OutboundMessageStatus)) {
      await whatsappConversationService.updateOutboundStatus({
        tenantId,
        metaMessageId: status.id,
        status: status.status as OutboundMessageStatus,
      });
    }
  },

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

  async saveEvent(tenantId: string, event: WhatsAppWebhookEventInput): Promise<void> {
    const { db } = getFirebaseAdmin();
    const eventsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(WEBHOOK_EVENTS_COLLECTION);

    await eventsRef.add(event);
  },
};
