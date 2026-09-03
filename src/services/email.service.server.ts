// src/services/email.service.server.ts
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { EmailTemplate, EmailLog, EmailStatus } from '@/types/email.types';

export const emailServiceServer = {
  /**
   * Registra un intento de envío de correo usando Firebase Admin SDK
   * (Tiene permisos completos, no está sujeto a reglas de seguridad)
   */
  async logEmail(
    tenantId: string,
    logData: Omit<EmailLog, 'id' | 'tenantId' | 'createdAt'>
  ): Promise<string> {
    const { db } = getFirebaseAdmin();
    const now = new Date().toISOString();

    const newLog = {
      ...logData,
      tenantId,
      createdAt: now,
    };

    const docRef = await db.collection('tenants').doc(tenantId).collection('emailLogs').add(newLog);
    return docRef.id;
  },

  /**
   * Obtiene el historial de correos de un tenant usando Admin SDK
   */
  async getEmailLogsByTenant(tenantId: string, limitCount: number = 50): Promise<EmailLog[]> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailLogs')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as EmailLog));
  }
};