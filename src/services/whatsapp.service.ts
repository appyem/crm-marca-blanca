// src/services/whatsapp.service.ts

import {
  WhatsAppSendResult,
  WhatsAppSendResponse,
  WhatsAppTextMessage,
  WhatsAppTemplateMessage,
  PhoneValidationResult,
} from '@/types/whatsapp.types';

const META_GRAPH_API_VERSION = 'v19.0';
const META_GRAPH_API_URL = 'https://graph.facebook.com';

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error('WHATSAPP_TOKEN no está configurado en las variables de entorno.');
  }
  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID no está configurado en las variables de entorno.');
  }

  return { token, phoneNumberId };
}

function validateAndNormalizePhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Número de teléfono vacío o inválido.' };
  }

  let cleaned = phone.replace(/[\s\-\(\)\.\+]/g, '');

  // Validar que solo contenga dígitos
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'El número contiene caracteres no numéricos.' };
  }

  // CASO 1: Número colombiano con código 57 (12 dígitos)
  if (cleaned.startsWith('57') && cleaned.length === 12) {
    return { valid: true, normalized: cleaned };
  }

  // CASO 2: Número colombiano sin código (10 dígitos empezando con 3)
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '57' + cleaned;
    return { valid: true, normalized: cleaned };
  }

  // CASO 3: Número internacional (7 a 15 dígitos, formato E.164)
  // Incluye España (+34), México (+52), Argentina (+54), USA (+1), etc.
  if (cleaned.length >= 7 && cleaned.length <= 15) {
    return { valid: true, normalized: cleaned };
  }

  return {
    valid: false,
    error: `Formato de número inválido. Recibido: ${phone} (${cleaned.length} dígitos). Se esperan entre 7 y 15 dígitos.`,
  };
}


export const whatsappService = {
  /**
   * Envía un mensaje de texto simple (solo para conversaciones activas de 24h).
   */
  async sendTextMessage(to: string, body: string): Promise<WhatsAppSendResult> {
    try {
      const phoneValidation = validateAndNormalizePhone(to);
      if (!phoneValidation.valid || !phoneValidation.normalized) {
        return {
          success: false,
          error: {
            code: 400,
            message: 'Número de destino inválido',
            details: phoneValidation.error,
          },
        };
      }

      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return {
          success: false,
          error: { code: 400, message: 'El cuerpo del mensaje está vacío.' },
        };
      }

      if (body.length > 4096) {
        return {
          success: false,
          error: {
            code: 400,
            message: `Mensaje demasiado largo (${body.length} caracteres). Máximo: 4096.`,
          },
        };
      }

      const { token, phoneNumberId } = getConfig();

      const messagePayload: WhatsAppTextMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneValidation.normalized,
        type: 'text',
        text: { body: body.trim(), preview_url: false },
      };

      const url = `${META_GRAPH_API_URL}/${META_GRAPH_API_VERSION}/${phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const result: WhatsAppSendResponse = await response.json();

      if (result.error) {
        return {
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.error_data?.details,
          },
        };
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        waId: result.contacts?.[0]?.wa_id,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[whatsappService] Error en sendTextMessage:', err);
      return {
        success: false,
        error: { code: 500, message: errorMessage },
      };
    }
  },

  /**
   * Envía un mensaje usando una PLANTILLA APROBADA por Meta.
   * Esto es OBLIGATORIO para iniciar conversaciones con números nuevos.
   * 
   * @param to Número de destino
   * @param templateName Nombre de la plantilla (ej: 'saludo_alcaldes')
   * @param variables Array de valores para las variables {{1}}, {{2}}, etc.
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    variables: string[]
  ): Promise<WhatsAppSendResult> {
    try {
      const phoneValidation = validateAndNormalizePhone(to);
      if (!phoneValidation.valid || !phoneValidation.normalized) {
        return {
          success: false,
          error: {
            code: 400,
            message: 'Número de destino inválido',
            details: phoneValidation.error,
          },
        };
      }

      if (!templateName || typeof templateName !== 'string') {
        return {
          success: false,
          error: { code: 400, message: 'Nombre de plantilla vacío.' },
        };
      }

      const { token, phoneNumberId } = getConfig();

      // Construir el componente body con las variables
      const bodyParameters = variables.map(v => ({
        type: 'text' as const,
        text: String(v ?? ''),
      }));

      const messagePayload: WhatsAppTemplateMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneValidation.normalized,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_CO' },
          components: bodyParameters.length > 0
            ? [{ type: 'body', parameters: bodyParameters }]
            : undefined,
        },
      };

      const url = `${META_GRAPH_API_URL}/${META_GRAPH_API_VERSION}/${phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const result: WhatsAppSendResponse = await response.json();

      if (result.error) {
        return {
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.error_data?.details,
          },
        };
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        waId: result.contacts?.[0]?.wa_id,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[whatsappService] Error en sendTemplateMessage:', err);
      return {
        success: false,
        error: { code: 500, message: errorMessage },
      };
    }
  },

  validatePhone(phone: string): PhoneValidationResult {
    return validateAndNormalizePhone(phone);
  },
};