// src/types/whatsappBlockedNumber.types.ts

export const BLOCK_REASONS = [
  'spam',
  'no_contactar',
  'cliente_problematico',
  'otro',
] as const;

export type BlockReason = typeof BLOCK_REASONS[number];

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  spam: 'Spam',
  no_contactar: 'No contactar',
  cliente_problematico: 'Cliente problemático',
  otro: 'Otro',
};

export interface BlockedNumber {
  id: string;
  tenantId: string;
  phoneNumber: string;
  displayPhone: string;
  contactName: string;
  reason: BlockReason;
  reasonDetails?: string;
  blockedBy: string;
  blockedAt: string;
}

export interface BlockedNumberInput {
  phoneNumber: string;
  reason: BlockReason;
  reasonDetails?: string;
  contactName?: string;
}
