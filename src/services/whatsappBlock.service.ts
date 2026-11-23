// src/services/whatsappBlock.service.ts

import { getFirebaseAdmin } from '@/lib/firebase/admin';
import {
  BlockedNumber,
  BlockedNumberInput,
  BlockReason,
  BLOCK_REASONS,
} from '@/types/whatsappBlockedNumber.types';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

const BLOCKED_COLLECTION = 'blockedNumbers';

function formatDisplayPhone(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('57') && cleaned.length === 12) {
    return `+57 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  return phoneNumber;
}

function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '');
}

function mapDoc(doc: QueryDocumentSnapshot<DocumentData>): BlockedNumber {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: (data.tenantId as string) || '',
    phoneNumber: (data.phoneNumber as string) || '',
    displayPhone: (data.displayPhone as string) || '',
    contactName: (data.contactName as string) || '',
    reason: (data.reason as BlockReason) || 'otro',
    reasonDetails: (data.reasonDetails as string) || undefined,
    blockedBy: (data.blockedBy as string) || '',
    blockedAt: (data.blockedAt as string) || '',
  };
}

export const whatsappBlockService = {
  /**
   * Bloquea un número. Si ya está bloqueado, actualiza la razón.
   */
  async blockNumber(
    tenantId: string,
    input: BlockedNumberInput,
    blockedByUserId: string
  ): Promise<BlockedNumber> {
    const { db } = getFirebaseAdmin();
    const normalized = normalizePhoneNumber(input.phoneNumber);

    if (normalized.length < 7 || normalized.length > 15) {
      throw new Error('Número de teléfono inválido. Debe tener entre 7 y 15 dígitos.');
    }

    if (!BLOCK_REASONS.includes(input.reason)) {
      throw new Error(`Razón inválida. Debe ser una de: ${BLOCK_REASONS.join(', ')}`);
    }

    if (input.reason === 'otro' && (!input.reasonDetails || input.reasonDetails.trim().length === 0)) {
      throw new Error('Si la razón es "Otro", debes especificar los detalles.');
    }

    const now = new Date().toISOString();
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(BLOCKED_COLLECTION)
      .doc(normalized);

    const data: Record<string, unknown> = {
      tenantId,
      phoneNumber: normalized,
      displayPhone: formatDisplayPhone(normalized),
      contactName: input.contactName || '',
      reason: input.reason,
      reasonDetails: input.reasonDetails?.trim() || null,
      blockedBy: blockedByUserId,
      blockedAt: now,
    };

    await docRef.set(data);

    return {
      id: normalized,
      tenantId,
      phoneNumber: normalized,
      displayPhone: formatDisplayPhone(normalized),
      contactName: input.contactName || '',
      reason: input.reason,
      reasonDetails: input.reasonDetails?.trim() || undefined,
      blockedBy: blockedByUserId,
      blockedAt: now,
    };
  },

  /**
   * Desbloquea un número. Devuelve true si se desbloqueó, false si no estaba bloqueado.
   */
  async unblockNumber(tenantId: string, phoneNumber: string): Promise<boolean> {
    const { db } = getFirebaseAdmin();
    const normalized = normalizePhoneNumber(phoneNumber);
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(BLOCKED_COLLECTION)
      .doc(normalized);

    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  },

  /**
   * Verifica si un número está bloqueado para un tenant.
   * Diseñado para ser llamado en cada mensaje entrante (debe ser rápido).
   */
  async isBlocked(tenantId: string, phoneNumber: string): Promise<boolean> {
    const { db } = getFirebaseAdmin();
    const normalized = normalizePhoneNumber(phoneNumber);
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(BLOCKED_COLLECTION)
      .doc(normalized);

    const doc = await docRef.get();
    return doc.exists;
  },

  /**
   * Obtiene la lista completa de números bloqueados para un tenant.
   */
  async getBlockedNumbers(tenantId: string): Promise<BlockedNumber[]> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection(BLOCKED_COLLECTION)
      .orderBy('blockedAt', 'desc')
      .limit(500)
      .get();

    return snapshot.docs.map(mapDoc);
  },
};
