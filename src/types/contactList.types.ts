// src/types/contactList.types.ts

export interface ContactList {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color: string;
  contactCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListInput {
  tenantId: string;
  name: string;
  description?: string;
  color: string;
  contactCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListUpdate {
  name?: string;
  description?: string;
  color?: string;
  updatedAt: string;
}

export const LIST_COLORS = [
  '#25D366', // WhatsApp green
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

export type ListColor = typeof LIST_COLORS[number];
