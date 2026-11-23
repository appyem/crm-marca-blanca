// src/services/contactList.service.ts

import { getFirebaseAdmin } from '@/lib/firebase/admin';
import {
  ContactList,
  ContactListInput,
  ContactListUpdate,
} from '@/types/contactList.types';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

const LISTS_COLLECTION = 'contactLists';

function mapListDoc(doc: QueryDocumentSnapshot<DocumentData>): ContactList {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: (data.tenantId as string) || '',
    name: (data.name as string) || '',
    description: data.description as string | undefined,
    color: (data.color as string) || '#3b82f6',
    contactCount: (data.contactCount as number) || 0,
    createdBy: (data.createdBy as string) || '',
    createdAt: (data.createdAt as string) || '',
    updatedAt: (data.updatedAt as string) || '',
  };
}

export const contactListService = {
  async create(input: ContactListInput): Promise<string> {
    const { db } = getFirebaseAdmin();
    const ref = await db
      .collection('tenants')
      .doc(input.tenantId)
      .collection(LISTS_COLLECTION)
      .add(input);
    return ref.id;
  },

  async getListsByTenant(tenantId: string): Promise<ContactList[]> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection(LISTS_COLLECTION)
      .orderBy('name', 'asc')
      .get();
    return snapshot.docs.map(mapListDoc);
  },

  async getList(tenantId: string, listId: string): Promise<ContactList | null> {
    const { db } = getFirebaseAdmin();
    const doc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection(LISTS_COLLECTION)
      .doc(listId)
      .get();
    if (!doc.exists) return null;
    return mapListDoc(doc);
  },

  async update(
    tenantId: string,
    listId: string,
    update: ContactListUpdate
  ): Promise<void> {
    const { db } = getFirebaseAdmin();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection(LISTS_COLLECTION)
      .doc(listId)
      .update(update);
  },

  async delete(tenantId: string, listId: string): Promise<void> {
    const { db } = getFirebaseAdmin();
    const listRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(LISTS_COLLECTION)
      .doc(listId);

    const contactsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .where('listIds', 'array-contains', listId)
      .get();

    const batch = db.batch();

    contactsSnapshot.docs.forEach(doc => {
      const currentListIds = (doc.data().listIds as string[]) || [];
      const newListIds = currentListIds.filter(id => id !== listId);
      batch.update(doc.ref, { listIds: newListIds });
    });

    batch.delete(listRef);
    await batch.commit();
  },

  async addContacts(
    tenantId: string,
    listId: string,
    contactIds: string[]
  ): Promise<{ added: number }> {
    if (contactIds.length === 0) return { added: 0 };

    const { db } = getFirebaseAdmin();
    const listRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(LISTS_COLLECTION)
      .doc(listId);

    const contactsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts');

    const batch = db.batch();
    let addedCount = 0;

    for (const contactId of contactIds) {
      const contactDoc = await contactsRef.doc(contactId).get();
      if (!contactDoc.exists) continue;

      const currentListIds = (contactDoc.data()?.listIds as string[]) || [];
      if (!currentListIds.includes(listId)) {
        batch.update(contactDoc.ref, { listIds: [...currentListIds, listId] });
        addedCount++;
      }
    }

    batch.update(listRef, { updatedAt: new Date().toISOString() });
    await batch.commit();

    // Recalcular contador exacto tras el commit
    const finalIds = await this.getContactIds(tenantId, listId);
    await listRef.update({ contactCount: finalIds.length });

    return { added: addedCount };
  },

  async removeContacts(
    tenantId: string,
    listId: string,
    contactIds: string[]
  ): Promise<{ removed: number }> {
    if (contactIds.length === 0) return { removed: 0 };

    const { db } = getFirebaseAdmin();
    const listRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(LISTS_COLLECTION)
      .doc(listId);

    const contactsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts');

    const batch = db.batch();
    let removedCount = 0;

    for (const contactId of contactIds) {
      const contactDoc = await contactsRef.doc(contactId).get();
      if (!contactDoc.exists) continue;

      const currentListIds = (contactDoc.data()?.listIds as string[]) || [];
      if (currentListIds.includes(listId)) {
        const newListIds = currentListIds.filter(id => id !== listId);
        batch.update(contactDoc.ref, { listIds: newListIds });
        removedCount++;
      }
    }

    batch.update(listRef, { updatedAt: new Date().toISOString() });
    await batch.commit();

    const finalIds = await this.getContactIds(tenantId, listId);
    await listRef.update({ contactCount: finalIds.length });

    return { removed: removedCount };
  },

  async getContactIds(tenantId: string, listId: string): Promise<string[]> {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .where('listIds', 'array-contains', listId)
      .get();
    return snapshot.docs.map(doc => doc.id);
  },
};
