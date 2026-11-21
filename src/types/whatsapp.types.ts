// src/types/whatsapp.types.ts

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

export interface WhatsAppTemplateParameter {
  type: 'text';
  text: string;
}

export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters?: WhatsAppTemplateParameter[];
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

export type WhatsAppMessage = WhatsAppTextMessage | WhatsAppTemplateMessage;

export interface WhatsAppSendResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
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

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

// ==========================================
// NUEVO: Tipos para plantillas aprobadas
// ==========================================
export interface ApprovedTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  variables: string[];
}

// Lista de plantillas aprobadas en Meta (mantener sincronizado con Meta Business)
export const APPROVED_TEMPLATES: ApprovedTemplate[] = [
  {
    id: 'saludo_alcaldes',
    name: 'saludo_alcaldes',
    displayName: 'Saludo a Alcaldes',
    description: 'Plantilla para enviar propuesta a alcaldías de Caldas',
    variables: ['nombre', 'municipio'], // {{1}} = nombre, {{2}} = municipio
  },
];