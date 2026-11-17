// src/services/email.service.ts
import { 
  collection, 
  doc, 
  getDoc,
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  and,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { 
  EmailTemplate, 
  EmailLog, 
  EmailStats,
  EmailStatsQuery,
  EmailEventLog
} from '@/types/email.types';

// Tipo auxiliar para datos de Firestore sin el 'id' ni 'tenantId' del documento
type FirestoreDocData<T> = Omit<T, 'id'>;
type CreateTemplateData = Omit<EmailTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

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
      tenantId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(templatesRef, newTemplate);
    return docRef.id;
  },

  async updateTemplate(
    tenantId: string,
    templateId: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<void> {
    const templateRef = doc(db, 'tenants', tenantId, 'emailTemplates', templateId);
    await updateDoc(templateRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const templateRef = doc(db, 'tenants', tenantId, 'emailTemplates', templateId);
    await deleteDoc(templateRef);
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
    logData: Omit<EmailLog, 'id' | 'tenantId' | 'createdAt'> & { resendId?: string }
  ): Promise<string> {
    const logsRef = collection(db, 'tenants', tenantId, 'emailLogs');
    const now = new Date().toISOString();

    const newLog = {
      ...logData,
      resendId: logData.resendId || null,
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
  },

  // ==========================================
  // ANALÍTICAS
  // ==========================================

  async getEmailStats(tenantId: string, queryData: EmailStatsQuery): Promise<EmailStats> {
    const logsRef = collection(db, 'tenants', tenantId, 'emailLogs');
    
    const q = query(
      logsRef,
      and(
        where('createdAt', '>=', queryData.startDate),
        where('createdAt', '<=', queryData.endDate)
      )
    );
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data() as FirestoreDocData<EmailLog>),
    } as EmailLog));

    const filteredLogs = queryData.status 
      ? logs.filter(log => log.status === queryData.status)
      : logs;

    const finalLogs = queryData.templateId
      ? filteredLogs.filter(log => log.templateId === queryData.templateId)
      : filteredLogs;

    const totalSent = finalLogs.length;
    const delivered = finalLogs.filter(l => l.status === 'DELIVERED' || l.status === 'OPENED' || l.status === 'CLICKED').length;
    const opened = finalLogs.filter(l => l.status === 'OPENED' || l.status === 'CLICKED').length;
    const clicked = finalLogs.filter(l => l.status === 'CLICKED').length;
    const bounced = finalLogs.filter(l => l.status === 'BOUNCED').length;
    const failed = finalLogs.filter(l => l.status === 'FAILED').length;

    return {
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      bounceRate: totalSent > 0 ? Math.round((bounced / totalSent) * 100) : 0,
    };
  },

  async getEmailLogsWithFilters(
    tenantId: string,
    queryData: EmailStatsQuery,
    limitCount: number = 100
  ): Promise<EmailLog[]> {
    const logsRef = collection(db, 'tenants', tenantId, 'emailLogs');
    
    const constraints = [];
    constraints.push(where('createdAt', '>=', queryData.startDate));
    constraints.push(where('createdAt', '<=', queryData.endDate));
    if (queryData.status) {
      constraints.push(where('status', '==', queryData.status));
    }

    const q = query(logsRef, and(...constraints), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data() as FirestoreDocData<EmailLog>),
    } as EmailLog));

    const finalLogs = queryData.templateId
      ? logs.filter(log => log.templateId === queryData.templateId)
      : logs;

    return finalLogs.slice(0, limitCount);
  },

  async getEmailLogDetail(tenantId: string, logId: string): Promise<{ log: EmailLog; events: EmailEventLog[] } | null> {
    const logRef = doc(db, 'tenants', tenantId, 'emailLogs', logId);
    const logSnap = await getDoc(logRef);

    if (!logSnap.exists()) return null;

    const logData = {
      id: logSnap.id,
      ...convertTimestamps(logSnap.data() as FirestoreDocData<EmailLog>),
    } as EmailLog;

    const eventsRef = collection(db, 'tenants', tenantId, 'emailEvents');
    const eventsQuery = query(
      eventsRef,
      where('emailLogId', '==', logId),
      orderBy('timestamp', 'asc')
    );
    const eventsSnap = await getDocs(eventsQuery);

    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data() as FirestoreDocData<EmailEventLog>),
    } as EmailEventLog));

    return { log: logData, events };
  },
};