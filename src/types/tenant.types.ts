// src/types/tenant.types.ts

export interface Tenant {
  id: string;
  name: string;
  domain: string; // Ej: crm.appyempresa.digital
  customDomain?: string; // Ej: crm.cliente.com (opcional)
  plan: TenantPlan;
  status: TenantStatus;
  limits: TenantLimits;
  settings: TenantSettings;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type TenantPlan = 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'WHITE_LABEL';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface TenantLimits {
  maxUsers: number;
  maxContacts: number;
  maxCampaigns: number;
  maxEmailsPerMonth: number;
  maxWhatsAppMessagesPerMonth: number;
  maxStorageMB: number;
}

export interface TenantSettings {
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    faviconUrl?: string;
  };
  email: {
    fromName?: string;
    replyTo?: string;
  };
  whatsapp: {
    businessName?: string;
  };
}

export interface UserWithTenant {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  tenantId: string;
  tenantName?: string; // Para mostrar en UI
}