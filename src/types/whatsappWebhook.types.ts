// src/types/whatsappWebhook.types.ts

export type WebhookEventType = 
  | 'message_received'
  | 'message_delivered'
  | 'message_read'
  | 'message_failed'
  | 'message_sent'
  | 'unknown';

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

export type MessageStatus = 
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'deleted';

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

export interface WebhookMediaPayload {
  mime_type: string;
  sha256: string;
  id: string;
  voice?: boolean;
  caption?: string;
  filename?: string;
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
  image?: WebhookMediaPayload;
  audio?: WebhookMediaPayload;
  video?: WebhookMediaPayload;
  document?: WebhookMediaPayload;
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
  id: string;
  changes: WebhookChange[];
}

export interface WebhookPayload {
  object: 'whatsapp_business_account';
  entry: WebhookEntry[];
}

export interface WhatsAppWebhookEvent {
  id: string;
  tenantId: string;
  eventType: WebhookEventType;
  messageId?: string;
  from?: string;
  to?: string;
  messageText?: string;
  messageType?: IncomingMessageType;
  status?: MessageStatus;
  errorCode?: number;
  errorMessage?: string;
  conversationId?: string;
  conversationType?: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  contactName?: string;
  eventTimestamp: string;
  receivedAt: string;
  rawPayload: unknown;
  referral?: {
    sourceUrl?: string;
    sourceType?: string;
    sourceId?: string;
    headline?: string;
    body?: string;
    mediaType?: string;
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    ctwaClid?: string;
  };
}

export type WhatsAppWebhookEventInput = Omit<WhatsAppWebhookEvent, 'id'>;

export interface WebhookVerifyParams {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}
