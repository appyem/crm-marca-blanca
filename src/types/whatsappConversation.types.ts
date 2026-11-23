// src/types/whatsappConversation.types.ts

export type ConversationStatus = 'PENDIENTE' | 'EN_CURSO' | 'ATENDIDA' | 'CERRADA';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export type OutboundMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type WhatsAppMediaType = 'image' | 'audio' | 'video' | 'document';

export interface WhatsAppMessageMedia {
  type: WhatsAppMediaType;
  mediaFileId?: string;
  mimeType?: string;
  sizeBytes?: number;
  caption?: string;
  fileName?: string;
  metaMediaId?: string;
}

export interface WhatsAppConversation {
  id: string;
  tenantId: string;
  phoneNumber: string;
  displayPhone: string;
  contactName: string;
  contactId?: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageDirection: MessageDirection;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversationInput {
  tenantId: string;
  phoneNumber: string;
  displayPhone: string;
  contactName: string;
  contactId?: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageDirection: MessageDirection;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  direction: MessageDirection;
  messageType: string;
  text: string;
  metaMessageId?: string;
  status?: OutboundMessageStatus;
  templateName?: string;
  media?: WhatsAppMessageMedia;
  timestamp: string;
  createdAt: string;
}

export interface WhatsAppMessageInput {
  tenantId: string;
  conversationId: string;
  direction: MessageDirection;
  messageType: string;
  text: string;
  metaMessageId?: string;
  status?: OutboundMessageStatus;
  templateName?: string;
  media?: WhatsAppMessageMedia;
  timestamp: string;
  createdAt: string;
}
