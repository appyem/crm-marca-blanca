// src/types/email.types.ts

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmailStatus = 
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED';

export interface EmailLog {
  id: string;
  tenantId: string;
  templateId?: string;
  contactId?: string;
  to: string;
  subject: string;
  body: string;
  status: EmailStatus;
  errorMessage?: string;
  sentAt?: string;
  resendId?: string;
  openCount?: number;
  clickCount?: number;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailEvent = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';

export interface EmailEventLog {
  id: string;
  emailLogId: string;
  tenantId: string;
  type: EmailEvent;
  timestamp: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    url?: string;
    link?: string;
  };
}