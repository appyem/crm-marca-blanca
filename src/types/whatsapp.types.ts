// src/types/whatsapp.types.ts

// ==========================================
// TIPOS DE WHATSAPP BUSINESS API (Meta Cloud API)
// ==========================================

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  waId?: string;
  error?: {
    code: number;
    message: string;
    details?: string;
  };
}

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    body: string;
    preview_url?: boolean;
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppTemplateComponent[];
  };
}

export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters?: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time';
  text?: string;
}

export type WhatsAppMessage = WhatsAppTextMessage | WhatsAppTemplateMessage;

// Respuesta de la API de Meta al enviar un mensaje
export interface WhatsAppSendResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_data?: {
      messaging_product: string;
      details: string;
    };
    fbtrace_id: string;
  };
}

// Resultado de validación de número
export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string; // Ej: "573106524453"
  error?: string;
}