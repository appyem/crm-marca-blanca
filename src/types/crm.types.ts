// src/types/crm.types.ts

// ==========================================
// EMPRESAS
// ==========================================
export interface Company {
  id: string;
  tenantId: string; // OBLIGATORIO para aislamiento multi-tenant
  name: string;
  domain?: string;
  sector?: string;
  city?: string;
  country?: string;
  website?: string;
  phone?: string;
  tags: string[];
  ownerId: string; // ID del usuario responsable
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// ==========================================
// CONTACTOS Y LEADS
// ==========================================
export type ContactType = 'LEAD' | 'PROSPECT' | 'CLIENT';

export interface Contact {
  id: string;
  tenantId: string; // OBLIGATORIO
  type: ContactType;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  companyId?: string; // Relación con Empresa
  companyName?: string;
  jobTitle?: string;
  city?: string;
  country?: string;
  sector?: string;
  tags: string[];
  source?: string; // Ej: 'Website', 'LinkedIn', 'Referido'
  ownerId: string; // ID del usuario responsable
  status: ContactStatus;
  consent: boolean; // Consentimiento de datos (GDPR/Ley de datos)
  lastInteraction?: string; // ISO timestamp
  customFields?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export type ContactStatus = 
  | 'NUEVO'
  | 'CONTACTADO'
  | 'INTERESADO'
  | 'REUNION'
  | 'PROPUESTA'
  | 'NEGOCIACION'
  | 'GANADO'
  | 'PERDIDO';

// ==========================================
// OPORTUNIDADES (DEALS / PIPELINE)
// ==========================================
export interface Opportunity {
  id: string;
  tenantId: string; // OBLIGATORIO
  name: string;
  contactId: string;
  companyId?: string;
  value: number;
  currency: string; // Ej: 'COP', 'USD', 'EUR'
  pipelineId: string;
  stageId: string;
  ownerId: string;
  expectedCloseDate?: string; // ISO timestamp
  probability: number; // 0 a 100
  status: 'ACTIVE' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  tenantId: string; // OBLIGATORIO
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string; // Ej: '#3B82F6' (Tailwind blue-500)
}

// ==========================================
// ACTIVIDADES Y TAREAS
// ==========================================
export type ActivityType = 'EMAIL' | 'WHATSAPP' | 'CALL' | 'MEETING' | 'NOTE' | 'TASK';

export interface Activity {
  id: string;
  tenantId: string; // OBLIGATORIO
  type: ActivityType;
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  userId: string; // Quién realizó la actividad
  title: string;
  description: string;
  metadata?: Record<string, unknown>; // Datos específicos del canal (ej: email subject, whatsapp message id)
  createdAt: string;
}

export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
export type TaskPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Task {
  id: string;
  tenantId: string; // OBLIGATORIO
  title: string;
  description: string;
  type: ActivityType;
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  assigneeId: string; // Usuario asignado
  dueDate: string; // ISO timestamp
  priority: TaskPriority;
  status: TaskStatus;
  reminderMinutes?: number;
  createdAt: string;
  updatedAt: string;
}