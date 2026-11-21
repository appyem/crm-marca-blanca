// src/types/whatsappTemplate.types.ts

// ==========================================
// TIPOS PARA PLANTILLAS DE WHATSAPP BUSINESS API
// ==========================================

export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL' | 'DELETED';

export type TemplateCategory = 
  | 'MARKETING' 
  | 'UTILITY' 
  | 'AUTHENTICATION' 
  | 'ACCOUNT_UPDATE';

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'LOCATION';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: TemplateButton[];
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'CATALOG';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface WhatsAppTemplate {
  id: string;                    // ID interno en Firestore
  metaTemplateId: string;        // ID de Meta
  name: string;                  // Nombre único (ej: saludo_alcaldes)
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;              // Ej: es_CO
  components: TemplateComponent[];
  variables: TemplateVariable[]; // Variables extraídas automáticamente
  previewText: string;           // Texto del body con placeholders
  headerText?: string;
  footerText?: string;
  hasButtons: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

export interface TemplateVariable {
  index: number;                 // Posición: {{1}}, {{2}}, etc.
  name: string;                  // Nombre amigable (ej: "nombre", "municipio")
  example: string;               // Ejemplo para preview
  location: 'header' | 'body';   // Dónde aparece la variable
}

// Respuesta de la API de Meta
export interface MetaTemplateResponse {
  id: string;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
  rejected_reason?: string;
  quality_score?: {
    score: string;
  };
}

export interface MetaTemplatesListResponse {
  data: MetaTemplateResponse[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// Para guardar en Firestore (sin campos computados)
export interface WhatsAppTemplateDocument {
  metaTemplateId: string;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
  variables: TemplateVariable[];
  previewText: string;
  headerText?: string;
  footerText?: string;
  hasButtons: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

// Estado de sincronización
export interface SyncResult {
  success: boolean;
  templatesSynced: number;
  added: number;
  updated: number;
  errors: string[];
  lastSyncedAt: string;
}