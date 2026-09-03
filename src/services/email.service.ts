// src/services/email.service.ts
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { EmailTemplate, EmailLog, EmailStatus } from '@/types/email.types';

// Tipo auxiliar para datos de Firestore sin el 'id' ni 'tenantId' del documento
type FirestoreDocData<T> = Omit<T, 'id'>;
type CreateTemplateData = Omit<EmailTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type CreateLogData = Omit<EmailLog, 'id' | 'tenantId' | 'createdAt'>;

// Función auxiliar para convertir Timestamps a string ISO
const convertTimestamps = <T extends Record<string, unknown>>(data: T): T => {
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = (result[key] as Timestamp).toDate().toISOString() as unknown as T[typeof key];
    }
  }
  return result;
};

// Función auxiliar para renderizar variables en la plantilla
export function renderTemplate(templateString: string, data: Record<string, string>): string {
  return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

export const emailService = {
  // ==========================================
  // PLANTILLAS (TEMPLATES)
  // ==========================================

  async createTemplate(
    tenantId: string,
    templateData: CreateTemplateData
  ): Promise<string> {
    const templatesRef = collection(db, 'tenants', tenantId, 'emailTemplates');
    const now = new Date().toISOString();

    const newTemplate = {
      ...templateData,
      tenantId, // Forzamos el tenantId por seguridad
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(templatesRef, newTemplate);
    return docRef.id;
  },

  async getActiveTemplatesByTenant(tenantId: string): Promise<EmailTemplate[]> {
    const templatesRef = collection(db, 'tenants', tenantId, 'emailTemplates');
    const q = query(
      templatesRef, 
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data() as FirestoreDocData<EmailTemplate>),
    } as EmailTemplate));
  },

  // ==========================================
  // REGISTRO DE ENVÍOS (LOGS)
  // ==========================================

  async logEmail(
    tenantId: string,
    logData: CreateLogData
  ): Promise<string> {
    const logsRef = collection(db, 'tenants', tenantId, 'emailLogs');
    const now = new Date().toISOString();

    const newLog = {
      ...logData,
      tenantId,
      createdAt: now,
    };

    const docRef = await addDoc(logsRef, newLog);
    return docRef.id;
  },

  async getEmailLogsByTenant(tenantId: string, limitCount: number = 50): Promise<EmailLog[]> {
    const logsRef = collection(db, 'tenants', tenantId, 'emailLogs');
    const q = query(logsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data() as FirestoreDocData<EmailLog>),
    } as EmailLog));
  }
};