// src/services/email.service.server.ts
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { EmailTemplate, EmailLog } from '@/types/email.types';
import { DocumentReference } from 'firebase-admin/firestore';

export const emailServiceServer = {
  /**
   * Registra un intento de envío de correo.
   * Devuelve la referencia del documento para poder actualizarlo después.
   */
  async logEmail(
    tenantId: string,
    logData: Omit<EmailLog, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<DocumentReference> {
    const { db } = getFirebaseAdmin();
    const now = new Date().toISOString();

    const newLog = {
      ...logData,
      tenantId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('tenants').doc(tenantId).collection('emailLogs').add(newLog);
    return docRef;
  },

  /**
   * Obtiene el historial de correos de un tenant
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