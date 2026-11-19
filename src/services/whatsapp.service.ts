// src/services/whatsapp.service.ts

import {
  WhatsAppSendResult,
  WhatsAppSendResponse,
  WhatsAppTextMessage,
  PhoneValidationResult,
} from '@/types/whatsapp.types';

// ==========================================
// CONFIGURACIÓN DE WHATSAPP BUSINESS API
// ==========================================
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

// ==========================================
// VALIDACIÓN Y NORMALIZACIÓN DE NÚMEROS
// ==========================================
function validateAndNormalizePhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Número de teléfono vacío o inválido.' };
  }

    // Validar y normalizar el número
  let cleaned = phone.replace(/[\s\-\(\)\.\+]/g, '');

  // Caso 1: Ya tiene formato internacional completo (57 + 10 dígitos = 12 dígitos totales)
  if (cleaned.startsWith('57') && cleaned.length === 12) {
    // Formato correcto, no hacer nada
  }
  // Caso 2: Formato colombiano sin código de país (10 dígitos empezando con 3)
  else if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '57' + cleaned;
  }
  // Caso 3: Cualquier otro formato es inválido
  else {
    return {
      valid: false,
      error: `Formato de número inválido. Se esperaba un número colombiano (10 dígitos empezando con 3) o internacional (57 + 10 dígitos). Recibido: ${phone} (${cleaned.length} dígitos)`,
    };
  }

  // Validar que solo tenga dígitos
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'El número contiene caracteres no numéricos.' };
  }

  return { valid: true, normalized: cleaned };
}

// ==========================================
// ENVÍO DE MENSAJES
// ==========================================
export const whatsappService = {
  /**
   * Envía un mensaje de texto simple a un número de WhatsApp.
   * @param to Número de destino (formato colombiano: 3106524453 o +573106524453)
   * @param body Texto del mensaje (máximo 4096 caracteres)
   */
  async sendTextMessage(to: string, body: string): Promise<WhatsAppSendResult> {
    try {
      // Validar y normalizar el número
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

      // Validar cuerpo del mensaje
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 400,
            message: 'El cuerpo del mensaje está vacío.',
          },
        };
      }

      if (body.length > 4096) {
        return {
          success: false,
          error: {
            code: 400,
            message: `Mensaje demasiado largo (${body.length} caracteres). Máximo permitido: 4096.`,
          },
        };
      }

      const { token, phoneNumberId } = getConfig();

      const messagePayload: WhatsAppTextMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneValidation.normalized,
        type: 'text',
        text: {
          body: body.trim(),
          preview_url: false,
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

      // Meta devuelve 200 incluso con errores (el error viene en el body)
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

      // Éxito: extraer messageId y waId
      const messageId = result.messages?.[0]?.id;
      const waId = result.contacts?.[0]?.wa_id;

      if (!messageId) {
        return {
          success: false,
          error: {
            code: 500,
            message: 'Meta respondió sin messageId. Revisa los logs de Vercel.',
          },
        };
      }

      return {
        success: true,
        messageId,
        waId,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al enviar mensaje';
      console.error('[whatsappService] Error en sendTextMessage:', err);
      return {
        success: false,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  },

  /**
   * Valida y normaliza un número de teléfono sin enviar nada.
   * Útil para verificar números antes de guardarlos en contactos.
   */
  validatePhone(phone: string): PhoneValidationResult {
    return validateAndNormalizePhone(phone);
  },
};