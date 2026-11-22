// src/types/whatsappWebhook.types.ts

// ==========================================
// TIPOS PARA WEBHOOKS DE WHATSAPP BUSINESS API
// ==========================================

export type WebhookEventType = 
  | 'message_received'
  | 'message_delivered'
  | 'message_read'
  | 'message_failed'
  | 'message_sent'
  | 'unknown';

// Tipos de mensajes entrantes
export type IncomingMessageType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'reaction'
  | 'unsupported';

// Estados de mensaje (statuses)
export type MessageStatus = 
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'deleted';

// ==========================================
// ESTRUCTURA DE EVENTOS DE META
// ==========================================

export interface WebhookMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WebhookTextMessage {
  body: string;
}

export interface WebhookInteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface WebhookButtonMessage {
  text: string;
  payload: string;
}

export interface WebhookIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: IncomingMessageType;
  text?: WebhookTextMessage;
  interactive?: WebhookInteractiveMessage;
  button?: WebhookButtonMessage;
  referral?: {
    source_url: string;
    source_type: string;
    source_id: string;
    headline: string;
    body: string;
    media_type: string;
  };
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data?: {
    details: string;
  };
}

export interface WebhookStatus {
  id: string;
  status: MessageStatus;
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WebhookError[];
}

export interface WebhookChangeValue {
  messaging_product: 'whatsapp';
  metadata: WebhookMetadata;
  contacts?: WebhookContact[];
  messages?: WebhookIncomingMessage[];
  statuses?: WebhookStatus[];
  errors?: WebhookError[];
}

export interface WebhookChange {
  value: WebhookChangeValue;
  field: 'messages';
}

export interface WebhookEntry {
  id: string; // WABA ID
  changes: WebhookChange[];
}

export interface WebhookPayload {
  object: 'whatsapp_business_account';
  entry: WebhookEntry[];
}

// ==========================================
// ESTRUCTURA PARA GUARDAR EN FIRESTORE
// ==========================================

export interface WhatsAppWebhookEvent {
  id: string;                    // ID generado por Firestore
  tenantId: string;              // Tenant al que pertenece
  eventType: WebhookEventType;
  
  // Datos del mensaje (si aplica)
  messageId?: string;            // ID del mensaje de WhatsApp (wamid...)
  from?: string;                 // Número que envió (si es mensaje entrante)
  to?: string;                   // Número destinatario (si es status)
  messageText?: string;          // Texto del mensaje (si es text)
  messageType?: IncomingMessageType;
  
  // Datos del status (si aplica)
  status?: MessageStatus;
  errorCode?: number;
  errorMessage?: string;
  
  // Datos de conversación
  conversationId?: string;       // ID de la conversación de 24h
  conversationType?: string;     // business_initiated, user_initiated, etc.
  
  // Metadata
  wabaId: string;                // WhatsApp Business Account ID
  phoneNumberId: string;         // Phone Number ID
  displayPhoneNumber?: string;
  contactName?: string;          // Nombre del contacto (si viene en el evento)
  
  // Timestamps
  eventTimestamp: string;        // Timestamp del evento (de Meta)
  receivedAt: string;            // Timestamp cuando lo recibimos
  
  // Raw payload (para debugging)
  rawPayload: unknown;
}

// Para crear un nuevo evento (sin id)
export type WhatsAppWebhookEventInput = Omit<WhatsAppWebhookEvent, 'id'>;

// ==========================================
// VERIFICACIÓN DE WEBHOOK (GET request)
// ==========================================

export interface WebhookVerifyParams {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}