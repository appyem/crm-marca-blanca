// src/services/tenant.service.ts
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tenant, TenantPlan, TenantStatus, TenantLimits } from '@/types/tenant.types';

// Límites por defecto según el plan
const DEFAULT_LIMITS: Record<TenantPlan, TenantLimits> = {
  FREE: {
    maxUsers: 3,
    maxContacts: 100,
    maxCampaigns: 2,
    maxEmailsPerMonth: 500,
    maxWhatsAppMessagesPerMonth: 100,
    maxStorageMB: 100,
  },
  BASIC: {
    maxUsers: 10,
    maxContacts: 1000,
    maxCampaigns: 10,
    maxEmailsPerMonth: 5000,
    maxWhatsAppMessagesPerMonth: 2000,
    maxStorageMB: 1000,
  },
  PRO: {
    maxUsers: 50,
    maxContacts: 10000,
    maxCampaigns: 50,
    maxEmailsPerMonth: 50000,
    maxWhatsAppMessagesPerMonth: 20000,
    maxStorageMB: 10000,
  },
  BUSINESS: {
    maxUsers: 200,
    maxContacts: 100000,
    maxCampaigns: 200,
    maxEmailsPerMonth: 500000,
    maxWhatsAppMessagesPerMonth: 200000,
    maxStorageMB: 50000,
  },
  WHITE_LABEL: {
    maxUsers: 1000,
    maxContacts: 1000000,
    maxCampaigns: 1000,
    maxEmailsPerMonth: 5000000,
    maxWhatsAppMessagesPerMonth: 2000000,
    maxStorageMB: 500000,
  },
};

export const tenantService = {
  /**
   * Crea un nuevo tenant en Firestore
   */
  async createTenant(
    name: string,
    domain: string,
    plan: TenantPlan = 'FREE'
  ): Promise<Tenant> {
    const tenantId = domain.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const now = new Date().toISOString();

    const tenant: Omit<Tenant, 'id'> = {
      name,
      domain,
      plan,
      status: 'ACTIVE',
      limits: DEFAULT_LIMITS[plan],
      settings: {
        branding: {},
        email: {},
        whatsapp: {},
      },
      createdAt: now,
      updatedAt: now,
    };

    const tenantRef = doc(db, 'tenants', tenantId);
    await setDoc(tenantRef, {
      ...tenant,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: tenantId,
      ...tenant,
    };
  },

  /**
   * Obtiene un tenant por su ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);

    if (!tenantDoc.exists()) {
      return null;
    }

    const data = tenantDoc.data();
    return {
      id: tenantDoc.id,
      name: data.name,
      domain: data.domain,
      customDomain: data.customDomain,
      plan: data.plan,
      status: data.status,
      limits: data.limits,
      settings: data.settings,
      createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
    } as Tenant;
  },

  /**
   * Actualiza un tenant
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>
  ): Promise<void> {
    const tenantRef = doc(db, 'tenants', tenantId);
    await updateDoc(tenantRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Obtiene todos los tenants (solo para Super Admin)
   */
  async getAllTenants(): Promise<Tenant[]> {
    const tenantsRef = collection(db, 'tenants');
    const snapshot = await getDocs(tenantsRef);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        domain: data.domain,
        customDomain: data.customDomain,
        plan: data.plan,
        status: data.status,
        limits: data.limits,
        settings: data.settings,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
      } as Tenant;
    });
  },

  /**
   * Cambia el estado de un tenant (activar/suspender)
   */
  async updateTenantStatus(tenantId: string, status: TenantStatus): Promise<void> {
    await this.updateTenant(tenantId, { status });
  },

  /**
   * Cambia el plan de un tenant y actualiza los límites automáticamente
   */
  async updateTenantPlan(tenantId: string, plan: TenantPlan): Promise<void> {
    await this.updateTenant(tenantId, {
      plan,
      limits: DEFAULT_LIMITS[plan],
    });
  },

  /**
   * Elimina un tenant (Advertencia: no borra subcolecciones automáticamente)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId));
  },

  /**
   * Obtiene estadísticas de uso del tenant (ej: correos enviados)
   */
  async getTenantStats(tenantId: string): Promise<{ emailsSent: number }> {
    const emailLogsRef = collection(db, 'tenants', tenantId, 'emailLogs');
    const snapshot = await getDocs(emailLogsRef);
    return { emailsSent: snapshot.size };
  },
};