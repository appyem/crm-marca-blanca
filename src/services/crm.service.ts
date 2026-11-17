// src/services/crm.service.ts
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Contact, Company, Opportunity } from '@/types/crm.types';

type FirestoreDocData<T> = Omit<T, 'id'>;
type CreateContactData = Omit<Contact, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type CreateCompanyData = Omit<Company, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type CreateOpportunityData = Omit<Opportunity, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

const convertTimestamps = <T extends Record<string, unknown>>(data: T): T => {
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = (result[key] as Timestamp).toDate().toISOString() as unknown as T[typeof key];
    }
  }
  return result;
};

// Helper de verificación de propiedad
async function verifyOwnership(
  collectionName: 'contacts' | 'companies' | 'opportunities',
  tenantId: string,
  docId: string
): Promise<void> {
  const ref = doc(db, 'tenants', tenantId, collectionName, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`${collectionName} no encontrado`);
  }
  const data = snap.data();
  if (data.tenantId !== tenantId) {
    throw new Error('Acceso denegado: el documento no pertenece a este tenant');
  }
}

export const crmService = {
  // ==========================================
  // CONTACTOS
  // ==========================================
  async createContact(tenantId: string, contactData: CreateContactData): Promise<string> {
    const contactsRef = collection(db, 'tenants', tenantId, 'contacts');
    const now = new Date().toISOString();
    const docRef = await addDoc(contactsRef, { ...contactData, tenantId, createdAt: now, updatedAt: now });
    return docRef.id;
  },

  async getContactsByTenant(tenantId: string): Promise<Contact[]> {
    const contactsRef = collection(db, 'tenants', tenantId, 'contacts');
    const q = query(contactsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data() as FirestoreDocData<Contact>) } as Contact));
  },

  async updateContact(tenantId: string, contactId: string, updates: Partial<Omit<Contact, 'id' | 'tenantId' | 'createdAt'>>): Promise<void> {
    await verifyOwnership('contacts', tenantId, contactId);
    const contactRef = doc(db, 'tenants', tenantId, 'contacts', contactId);
    await updateDoc(contactRef, { ...updates, updatedAt: new Date().toISOString() });
  },

  async deleteContact(tenantId: string, contactId: string): Promise<void> {
    await verifyOwnership('contacts', tenantId, contactId);
    await deleteDoc(doc(db, 'tenants', tenantId, 'contacts', contactId));
  },

  // ==========================================
  // EMPRESAS
  // ==========================================
  async createCompany(tenantId: string, companyData: CreateCompanyData): Promise<string> {
    const companiesRef = collection(db, 'tenants', tenantId, 'companies');
    const now = new Date().toISOString();
    const docRef = await addDoc(companiesRef, { ...companyData, tenantId, createdAt: now, updatedAt: now });
    return docRef.id;
  },

  async getCompaniesByTenant(tenantId: string): Promise<Company[]> {
    const companiesRef = collection(db, 'tenants', tenantId, 'companies');
    const q = query(companiesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data() as FirestoreDocData<Company>) } as Company));
  },

  async deleteCompany(tenantId: string, companyId: string): Promise<void> {
    await verifyOwnership('companies', tenantId, companyId);
    await deleteDoc(doc(db, 'tenants', tenantId, 'companies', companyId));
  },

  // ==========================================
  // OPORTUNIDADES (PIPELINE)
  // ==========================================
  async createOpportunity(tenantId: string, data: CreateOpportunityData): Promise<string> {
    const oppRef = collection(db, 'tenants', tenantId, 'opportunities');
    const now = new Date().toISOString();
    const docRef = await addDoc(oppRef, { ...data, tenantId, createdAt: now, updatedAt: now });
    return docRef.id;
  },

  async getOpportunitiesByTenant(tenantId: string): Promise<Opportunity[]> {
    const oppRef = collection(db, 'tenants', tenantId, 'opportunities');
    const q = query(oppRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data() as FirestoreDocData<Opportunity>) } as Opportunity));
  },

  async updateOpportunityStage(tenantId: string, opportunityId: string, stageId: string, status: Opportunity['status']): Promise<void> {
    await verifyOwnership('opportunities', tenantId, opportunityId);
    const oppRef = doc(db, 'tenants', tenantId, 'opportunities', opportunityId);
    await updateDoc(oppRef, { stageId, status, updatedAt: new Date().toISOString() });
  },

  async deleteOpportunity(tenantId: string, opportunityId: string): Promise<void> {
    await verifyOwnership('opportunities', tenantId, opportunityId);
    await deleteDoc(doc(db, 'tenants', tenantId, 'opportunities', opportunityId));
  },
};