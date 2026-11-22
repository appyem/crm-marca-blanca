// src/services/whatsappConversation.service.ts

import { getFirebaseAdmin } from '@/lib/firebase/admin';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  MessageDirection,
  OutboundMessageStatus,
  ConversationStatus,
} from '@/types/whatsappConversation.types';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

const CONVERSATIONS_COLLECTION = 'whatsappConversations';
const MESSAGES_COLLECTION = 'whatsappMessages';

function formatDisplayPhone(normalized: string): string {
  if (normalized.startsWith('57') && normalized.length === 12) {
    return `+57 ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}`;
  }
  return `+${normalized}`;
}

function mapConversationDoc(doc: QueryDocumentSnapshot<DocumentData>): WhatsAppConversation {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: (data.tenantId as string) || '',
    phoneNumber: (data.phoneNumber as string) || '',
    displayPhone: (data.displayPhone as string) || '',
    contactName: (data.contactName as string) || '',
    contactId: data.contactId as string | undefined,
    status: (data.status as ConversationStatus) || 'PENDIENTE',
    unreadCount: (data.unreadCount as number) || 0,
    lastMessageText: (data.lastMessageText as string) || '',
    lastMessageAt: (data.lastMessageAt as string) || '',
    lastMessageDirection: (data.lastMessageDirection as MessageDirection) || 'INBOUND',
    createdAt: (data.createdAt as string) || '',
    updatedAt: (data.updatedAt as string) || '',
  };
}

function mapMessageDoc(doc: QueryDocumentSnapshot<DocumentData>): WhatsAppMessage {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: (data.tenantId as string) || '',
    conversationId: (data.conversationId as string) || '',
    direction: (data.direction as MessageDirection) || 'INBOUND',
    messageType: (data.messageType as string) || 'text',
    text: (data.text as string) || '',
    metaMessageId: data.metaMessageId as string | undefined,
    status: data.status as OutboundMessageStatus | undefined,
    templateName: data.templateName as string | undefined,
    timestamp: (data.timestamp as string) || '',
    createdAt: (data.createdAt as string) || '',
  };
}

export const whatsappConversationService = {
  /**
   * Busca o crea la conversación de un número.
   * Actualiza últimos datos del mensaje y contadores según dirección.
   */
  async upsertConversation(params: {
    tenantId: string;
    phoneNumber: string;
    contactName?: string;
    direction: MessageDirection;
    messageText: string;
    messageTimestamp: string;
  }): Promise<string> {
    const { db } = getFirebaseAdmin();
    const convRef = db
      .collection('tenants')
      .doc(params.tenantId)
      .collection(CONVERSATIONS_COLLECTION);

    const existing = await convRef
      .where('phoneNumber', '==', params.phoneNumber)
      .limit(1)
      .get();

    const now = new Date().toISOString();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const current = mapConversationDoc(doc);

      const newStatus: ConversationStatus =
        params.direction === 'INBOUND'
          ? 'PENDIENTE'
          : current.status === 'PENDIENTE'
            ? 'EN_CURSO'
            : current.status;

      await convRef.doc(doc.id).update({
        status: newStatus,
        unreadCount: params.direction === 'INBOUND' ? current.unreadCount + 1 : 0,
        lastMessageText: params.messageText,
        lastMessageAt: params.messageTimestamp,
        lastMessageDirection: params.direction,
        contactName: params.contactName || current.contactName,
        updatedAt: now,
      });

      return doc.id;
    }

    // Nueva conversación: intentar vincular con contacto del CRM
    let contactId: string | undefined;
    let contactName = params.contactName || 'Contacto desconocido';

    try {
      const localPhone = params.phoneNumber.startsWith('57')
        ? params.phoneNumber.slice(2)
        : params.phoneNumber;

      const contactsSnapshot = await db
        .collection('tenants')
        .doc(params.tenantId)
        .collection('contacts')
        .where('phone', 'in', [params.phoneNumber, localPhone])
        .limit(1)
        .get();

      if (!contactsSnapshot.empty) {
        const contactDoc = contactsSnapshot.docs[0];
        contactId = contactDoc.id;
        const contactData = contactDoc.data();
        const firstName = (contactData?.firstName as string) || '';
        const lastName = (contactData?.lastName as string) || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) contactName = fullName;
      }
    } catch (matchError) {
      console.warn('[whatsappConversation] No se pudo vincular contacto CRM:', matchError);
    }

    const newConvRef = await convRef.add({
      tenantId: params.tenantId,
      phoneNumber: params.phoneNumber,
      displayPhone: formatDisplayPhone(params.phoneNumber),
      contactName,
      contactId: contactId || null,
      status: params.direction === 'INBOUND' ? 'PENDIENTE' : 'EN_CURSO',
      unreadCount: params.direction === 'INBOUND' ? 1 : 0,
      lastMessageText: params.messageText,
      lastMessageAt: params.messageTimestamp,
      lastMessageDirection: params.direction,
      createdAt: now,
      updatedAt: now,
    });

    return newConvRef.id;
  },

  /**
   * Agrega un mensaje al historial de la conversación.
   */
  async addMessage(params: {
    tenantId: string;
    conversationId: string;
    direction: MessageDirection;
    messageType: string;
    text: string;
    metaMessageId?: string;
    status?: OutboundMessageStatus;
    templateName?: string;
    timestamp: string;
  }): Promise<void> {
    const { db } = getFirebaseAdmin();
    await db
      .collection('tenants')
      .doc(params.tenantId)
      .collection(MESSAGES_COLLECTION)
      .add({
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        direction: params.direction,
        messageType: params.messageType,
        text: params.text,
        metaMessageId: params.metaMessageId || null,
        status: params.status || null,
        templateName: params.templateName || null,
        timestamp: params.timestamp,
        createdAt: new Date().toISOString(),
      });
  },

  /**
   * Actualiza el estado de entrega de un mensaje saliente (delivered, read, failed).
   */
  async updateOutboundStatus(params: {
    tenantId: string;
    metaMessageId: string;
    status: OutboundMessageStatus;
  }): Promise<boolean> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(params.tenantId)
      .collection(MESSAGES_COLLECTION)
      .where('metaMessageId', '==', params.metaMessageId)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.update({ status: params.status });
    return true;
  },

  /**
   * Lista conversaciones del tenant ordenadas por última actividad.
   */
  async getConversationsByTenant(tenantId: string): Promise<WhatsAppConversation[]> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection(CONVERSATIONS_COLLECTION)
      .orderBy('lastMessageAt', 'desc')
      .limit(200)
      .get();

    return snapshot.docs.map(mapConversationDoc);
  },

  /**
   * Lista mensajes de una conversación en orden cronológico.
   */
  async getMessagesByConversation(
    tenantId: string,
    conversationId: string
  ): Promise<WhatsAppMessage[]> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection(MESSAGES_COLLECTION)
      .where('conversationId', '==', conversationId)
      .limit(500)
      .get();

    const messages = snapshot.docs.map(mapMessageDoc);
    messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return messages;
  },

  /**
   * Marca la conversación como leída (unreadCount = 0).
   */
  async markAsRead(tenantId: string, conversationId: string): Promise<void> {
    const { db } = getFirebaseAdmin();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection(CONVERSATIONS_COLLECTION)
      .doc(conversationId)
      .update({ unreadCount: 0, updatedAt: new Date().toISOString() });
  },

  /**
   * Cambia el estado manual de la conversación (ATENDIDA, CERRADA, etc.).
   */
  async updateStatus(
    tenantId: string,
    conversationId: string,
    status: ConversationStatus
  ): Promise<void> {
    const { db } = getFirebaseAdmin();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection(CONVERSATIONS_COLLECTION)
      .doc(conversationId)
      .update({ status, updatedAt: new Date().toISOString() });
  },
};
