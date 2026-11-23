// src/app/(dashboard)/contacts/page.tsx
'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import { crmService } from '@/services/crm.service';
import { emailService } from '@/services/email.service';
import { tenantService } from '@/services/tenant.service';
import { importService, ParsedContact } from '@/services/import.service';
import { Contact, ContactType } from '@/types/crm.types';
import { EmailTemplate } from '@/types/email.types';
import { WhatsAppTemplate } from '@/types/whatsappTemplate.types';
import { ContactList } from '@/types/contactList.types';

export default function ContactsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    }>
      <ContactsPageContent />
    </Suspense>
  );
}

function ContactsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [isWhatsAppCampaignModalOpen, setIsWhatsAppCampaignModalOpen] = useState(false);
  const [whatsAppCampaignMessage, setWhatsAppCampaignMessage] = useState('');
  const [isSendingWhatsAppCampaign, setIsSendingWhatsAppCampaign] = useState(false);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([]);
  const [whatsAppTemplatesLoading, setWhatsAppTemplatesLoading] = useState(false);

  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [listFilter, setListFilter] = useState<string>('ALL');
  const [listMemberIds, setListMemberIds] = useState<Set<string> | null>(null);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [targetListId, setTargetListId] = useState<string>('');
  const [isAddingToList, setIsAddingToList] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: 'LEAD' as ContactType,
    companyName: '',
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    setError(null);
    try {
      const [contactsData, templatesData] = await Promise.all([
        crmService.getContactsByTenant(user.tenantId),
        emailService.getActiveTemplatesByTenant(user.tenantId)
      ]);
      setContacts(contactsData);
      setTemplates(templatesData);
    } catch (err) {
      setError('Error al cargar los datos.');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  const loadContactLists = useCallback(async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch('/api/contact-lists', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setContactLists(result.lists);
      }
    } catch (err) {
      console.error('[ContactLists] Error cargando:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized && !authLoading && user) {
      setInitialized(true);
      loadData();
      loadContactLists();
      const listParam = searchParams.get('list');
      if (listParam) setListFilter(listParam);
    }
  }, [initialized, authLoading, user, loadData, loadContactLists, searchParams]);

  useEffect(() => {
    if (!user) return;

    const loadWhatsAppTemplates = async () => {
      setWhatsAppTemplatesLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch('/api/whatsapp/templates', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          console.error('Error cargando plantillas WhatsApp:', response.status);
          return;
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.templates)) {
          const approvedTemplates = result.templates.filter(
            (t: WhatsAppTemplate) => t.status === 'APPROVED'
          );
          setWhatsAppTemplates(approvedTemplates);
        }
      } catch (err) {
        console.error('[WhatsAppTemplates] Error loading:', err);
      } finally {
        setWhatsAppTemplatesLoading(false);
      }
    };

    loadWhatsAppTemplates();
  }, [user]);

  useEffect(() => {
    if (!user || listFilter === 'ALL') {
      setListMemberIds(null);
      return;
    }
    let cancelled = false;
    const loadMembers = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch(`/api/contact-lists/${listFilter}/contacts`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        if (!cancelled && response.ok && result.success) {
          setListMemberIds(new Set<string>(result.contactIds));
        }
      } catch (err) {
        console.error('[ListMembers] Error cargando:', err);
      }
    };
    loadMembers();
    return () => { cancelled = true; };
  }, [user, listFilter]);

  const visibleContacts = listMemberIds
    ? contacts.filter(c => listMemberIds.has(c.id))
    : contacts;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD', companyName: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || '',
      phone: contact.phone || '',
      type: contact.type,
      companyName: contact.companyName || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    if (!user) return;
    if (!confirm('¿Estás seguro de eliminar este contacto? Esta acción no se puede deshacer.')) return;

    try {
      await crmService.deleteContact(user.tenantId, contactId);
      await loadData();
    } catch (err) {
      setError('Error al eliminar el contacto.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const contactPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        type: formData.type,
        companyName: formData.companyName || undefined,
        ownerId: user.uid,
        tags: [],
        consent: true,
        status: 'NUEVO' as Contact['status'],
      };

      if (editingContact) {
        await crmService.updateContact(user.tenantId, editingContact.id, contactPayload);
      } else {
        await crmService.createContact(user.tenantId, contactPayload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError('Error al guardar el contacto.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openImportModal = () => {
    setParsedContacts([]);
    setImportProgress(0);
    setIsImportModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setError(null);
    try {
      const parsed = await importService.parseExcelFile(file);
      setParsedContacts(parsed);
    } catch (err) {
      setError('No se pudo leer el archivo. Verifica que sea un Excel o CSV válido.');
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!user) return;
    const validContacts = parsedContacts.filter(c => c.isValid);

    if (validContacts.length === 0) {
      setError('No hay contactos válidos para importar.');
      return;
    }

    try {
      const tenant = await tenantService.getTenant(user.tenantId);
      if (tenant?.limits?.maxContacts) {
        const projected = contacts.length + validContacts.length;
        if (projected > tenant.limits.maxContacts) {
          setError(`Límite del plan excedido: tu plan permite ${tenant.limits.maxContacts} contactos y con esta importación tendrías ${projected}.`);
          return;
        }
      }
    } catch (err) {
      console.error('No se pudo verificar el límite del plan:', err);
    }

    setIsImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let failedCount = 0;

    try {
      const chunkSize = 10;
      for (let i = 0; i < validContacts.length; i += chunkSize) {
        const chunk = validContacts.slice(i, i + chunkSize);
        const results = await Promise.allSettled(
          chunk.map(contact =>
            crmService.createContact(user.tenantId, {
              firstName: contact.firstName || 'Sin nombre',
              lastName: contact.lastName,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              companyName: contact.companyName || undefined,
              type: contact.type,
              ownerId: user.uid,
              tags: ['importado'],
              consent: true,
              status: 'NUEVO' as Contact['status'],
            })
          )
        );
        results.forEach(r => (r.status === 'fulfilled' ? successCount++ : failedCount++));
        setImportProgress(Math.min(i + chunkSize, validContacts.length));
      }

      alert(`✅ Importación completada.\nExitosos: ${successCount}\nFallidos: ${failedCount}`);
      setIsImportModalOpen(false);
      setParsedContacts([]);
      await loadData();
    } catch (err) {
      setError('Error durante la importación.');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === visibleContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(visibleContacts.map(c => c.id)));
    }
  };

  const toggleSelectContact = (id: string) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContactIds(newSet);
  };

  const openCampaignModal = () => {
    if (selectedContactIds.size === 0) {
      setError('Por favor selecciona al menos un contacto.');
      return;
    }

    if (selectedContactIds.size > 100) {
      setError('⚠️ Límite excedido: Tu plan actual permite un máximo de 100 contactos por envío. Por favor, reduce la selección.');
      return;
    }

    if (templates.length === 0) {
      setError('No hay plantillas disponibles. Crea una en la sección de Email.');
      return;
    }
    setSelectedTemplateId(templates[0].id);
    setIsCampaignModalOpen(true);
  };

  const handleSendCampaign = async () => {
    if (!user || selectedContactIds.size === 0 || !selectedTemplateId) return;

    setIsSendingCampaign(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      if (!selectedTemplate) throw new Error('Plantilla no encontrada.');

      const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id) && c.email);

      const recipients = selectedContacts.map(contact => ({
        to: contact.email!,
        variables: {
          nombre: contact.firstName || 'Cliente',
          empresa: contact.companyName || 'Tu Empresa',
          email: contact.email || '',
        }
      }));

      const response = await fetch('/api/email/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          subject: selectedTemplate.subject,
          bodyText: selectedTemplate.body,
          recipients,
        }),
      });

      const parsedResult = await response.json();

      if (!response.ok) {
        throw new Error(parsedResult.error || `Error del servidor (${response.status})`);
      }

      alert(`✅ Campaña procesada.\nEnviados: ${parsedResult.summary.success}\nFallidos: ${parsedResult.summary.failed}`);
      setIsCampaignModalOpen(false);
      setSelectedContactIds(new Set());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido.';
      setError(errorMessage);
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const getVariableSource = (variableIndex: number): string => {
    const sources: Record<number, string> = {
      0: 'firstName del contacto',
      1: 'companyName del contacto',
      2: 'email del contacto',
      3: 'phone del contacto',
    };
    return sources[variableIndex] || `variable ${variableIndex + 1}`;
  };

  const openWhatsAppCampaignModal = () => {
    if (selectedContactIds.size === 0) {
      setError('Por favor selecciona al menos un contacto.');
      return;
    }

    const contactsWithPhone = contacts.filter(c => selectedContactIds.has(c.id) && c.phone);

    if (contactsWithPhone.length === 0) {
      setError('Ninguno de los contactos seleccionados tiene teléfono registrado.');
      return;
    }

    if (contactsWithPhone.length > 50) {
      setError(`⚠️ Límite excedido: WhatsApp permite máximo 50 contactos por campaña. Seleccionaste ${contactsWithPhone.length}.`);
      return;
    }

    if (whatsAppTemplates.length > 0) {
      setWhatsAppCampaignMessage(whatsAppTemplates[0].name);
    } else {
      setWhatsAppCampaignMessage('');
    }
    setIsWhatsAppCampaignModalOpen(true);
  };

  const handleSendWhatsAppCampaign = async () => {
    if (!user || selectedContactIds.size === 0 || !whatsAppCampaignMessage.trim()) return;

    setIsSendingWhatsAppCampaign(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const contactsWithPhone = contacts.filter(c => selectedContactIds.has(c.id) && c.phone);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const contact of contactsWithPhone) {
        try {
          const selectedTemplate = whatsAppTemplates.find(t => t.name === whatsAppCampaignMessage);
          const variables = selectedTemplate
            ? selectedTemplate.variables.map((v, idx) => {
                const sources: Record<number, string> = {
                  0: contact.firstName || '',
                  1: contact.companyName || '',
                  2: contact.email || '',
                  3: contact.phone || '',
                };
                return sources[idx] || '';
              })
            : [contact.firstName || '', contact.companyName || ''];

          const response = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              mode: 'template',
              to: contact.phone!,
              templateName: whatsAppCampaignMessage,
              variables,
            }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`${contact.firstName}: ${result.error?.message || 'Error desconocido'}`);
          }
        } catch (err) {
          failedCount++;
          errors.push(`${contact.firstName}: ${err instanceof Error ? err.message : 'Error'}`);
        }
      }

      let resultMessage = `✅ Campaña WhatsApp completada.\n\nEnviados: ${successCount}\nFallidos: ${failedCount}`;
      if (errors.length > 0 && errors.length <= 5) {
        resultMessage += `\n\nErrores:\n${errors.join('\n')}`;
      }

      alert(resultMessage);
      setIsWhatsAppCampaignModalOpen(false);
      setSelectedContactIds(new Set());
      setWhatsAppCampaignMessage('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error en campaña WhatsApp: ${errorMessage}`);
      console.error('[WhatsApp Campaign] Error:', err);
    } finally {
      setIsSendingWhatsAppCampaign(false);
    }
  };

  const handleAddToList = async () => {
    if (!user || selectedContactIds.size === 0 || !targetListId) return;
    setIsAddingToList(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const response = await fetch(`/api/contact-lists/${targetListId}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ contactIds: Array.from(selectedContactIds) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al agregar al listado');
      }

      alert(`✅ ${result.added} contacto(s) agregados al listado.`);
      setIsAddToListModalOpen(false);
      setTargetListId('');
      await loadContactLists();

      if (listFilter !== 'ALL') {
        const resp2 = await fetch(`/api/contact-lists/${listFilter}/contacts`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const res2 = await resp2.json();
        if (resp2.ok && res2.success) setListMemberIds(new Set<string>(res2.contactIds));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleRemoveFromList = async () => {
    if (!user || selectedContactIds.size === 0 || listFilter === 'ALL') return;
    if (!confirm('¿Quitar los contactos seleccionados de este listado? (No se eliminan del CRM)')) return;

    setIsAddingToList(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const response = await fetch(`/api/contact-lists/${listFilter}/contacts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ contactIds: Array.from(selectedContactIds) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al quitar del listado');
      }

      alert(`✅ ${result.removed} contacto(s) quitados del listado.`);
      await loadContactLists();

      const resp2 = await fetch(`/api/contact-lists/${listFilter}/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const res2 = await resp2.json();
      if (resp2.ok && res2.success) setListMemberIds(new Set<string>(res2.contactIds));
      setSelectedContactIds(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setIsAddingToList(false);
    }
  };

  if (authLoading || isFetching) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const validCount = parsedContacts.filter(c => c.isValid).length;
  const invalidCount = parsedContacts.length - validCount;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <nav style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
            <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>Contactos</span>
          </nav>

          <h1 style={{ marginBottom: '8px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Gestión de Contactos</h1>
          <p style={{ marginBottom: '16px', fontSize: '16px', color: '#6b7280' }}>Administra tus leads, prospectos y clientes.</p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" onClick={openCreateModal} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuevo Contacto
            </button>

            <button type="button" onClick={openImportModal} style={{ backgroundColor: '#7c3aed', color: 'white', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar Excel
            </button>

            <button type="button" onClick={openCampaignModal} disabled={selectedContactIds.size === 0} style={{ backgroundColor: selectedContactIds.size > 0 ? '#10b981' : '#9ca3af', color: 'white', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: selectedContactIds.size > 0 ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Enviar Campaña Email ({selectedContactIds.size})
            </button>

            <button
              type="button"
              onClick={openWhatsAppCampaignModal}
              disabled={selectedContactIds.size === 0}
              style={{
                backgroundColor: selectedContactIds.size > 0 ? '#25D366' : '#9ca3af',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: selectedContactIds.size > 0 ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📱 Enviar Campaña WhatsApp ({selectedContactIds.size})
            </button>

            <button
              type="button"
              onClick={() => { setTargetListId(contactLists[0]?.id || ''); setIsAddToListModalOpen(true); }}
              disabled={selectedContactIds.size === 0 || contactLists.length === 0}
              style={{
                backgroundColor: selectedContactIds.size > 0 && contactLists.length > 0 ? '#8b5cf6' : '#9ca3af',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: selectedContactIds.size > 0 && contactLists.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              📋 Agregar a Listado ({selectedContactIds.size})
            </button>

            {listFilter !== 'ALL' && (
              <button
                type="button"
                onClick={handleRemoveFromList}
                disabled={selectedContactIds.size === 0}
                style={{
                  backgroundColor: selectedContactIds.size > 0 ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: selectedContactIds.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                🗑️ Quitar del Listado ({selectedContactIds.size})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Filtrar por listado:</span>
            <button
              onClick={() => setListFilter('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                border: '1px solid',
                backgroundColor: listFilter === 'ALL' ? '#111827' : 'white',
                color: listFilter === 'ALL' ? 'white' : '#374151',
                borderColor: listFilter === 'ALL' ? '#111827' : '#d1d5db',
              }}
            >
              Todos ({contacts.length})
            </button>
            {contactLists.map(list => (
              <button
                key={list.id}
                onClick={() => setListFilter(list.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: '1px solid',
                  backgroundColor: listFilter === list.id ? list.color : 'white',
                  color: listFilter === list.id ? 'white' : '#374151',
                  borderColor: listFilter === list.id ? list.color : '#d1d5db',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: listFilter === list.id ? 'white' : list.color, display: 'inline-block' }}></span>
                {list.name} ({list.contactCount})
              </button>
            ))}
            <Link href="/contact-lists" style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
              Gestionar listados →
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>{error}</div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          {visibleContacts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontWeight: '500' }}>
                {listFilter !== 'ALL' ? 'No hay contactos en este listado.' : 'No hay contactos registrados aún.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', width: '40px' }}>
                      <input type="checkbox" checked={selectedContactIds.size === visibleContacts.length && visibleContacts.length > 0} onChange={toggleSelectAll} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Nombre</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Empresa</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Email</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Teléfono</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Tipo</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleContacts.map((contact) => (
                    <tr key={contact.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <input type="checkbox" checked={selectedContactIds.has(contact.id)} onChange={() => toggleSelectContact(contact.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{contact.firstName} {contact.lastName}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.companyName || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.email || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.phone || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.type}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openEditModal(contact)} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Editar</button>
                          <button onClick={() => handleDelete(contact.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: CREAR/EDITAR CONTACTO */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '448px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Apellido</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre de la Empresa</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Ej: Acme Corp" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Teléfono</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Tipo</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }}>
                    <option value="LEAD">Lead</option>
                    <option value="PROSPECT">Prospecto</option>
                    <option value="CLIENT">Cliente</option>
                  </select>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    {isSubmitting ? 'Guardando...' : (editingContact ? 'Actualizar' : 'Guardar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: IMPORTAR EXCEL */}
        {isImportModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '640px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Importar Contactos desde Excel</h2>
                <button onClick={() => setIsImportModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f3ff', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                <p style={{ fontSize: '14px', color: '#5b21b6', margin: 0 }}>
                  El archivo debe tener columnas como: Nombre, Apellido, Email, Teléfono, Empresa, Tipo.
                </p>
                <button type="button" onClick={() => importService.downloadTemplate()} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  Descargar Plantilla de Ejemplo
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Selecciona el archivo (.xlsx, .xls, .csv)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isParsing || isImporting}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }}
                />
              </div>

              {isParsing && <p style={{ fontSize: '14px', color: '#6b7280' }}>Leyendo archivo...</p>}

              {parsedContacts.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>✅ Válidos: {validCount}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>❌ Inválidos: {invalidCount}</span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Fila</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nombre</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Empresa</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedContacts.slice(0, 8).map((c) => (
                          <tr key={c.rowNumber} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px 12px', color: '#6b7280' }}>{c.rowNumber}</td>
                            <td style={{ padding: '8px 12px' }}>{c.firstName} {c.lastName}</td>
                            <td style={{ padding: '8px 12px' }}>{c.email || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>{c.companyName || '-'}</td>
                            <td style={{ padding: '8px 12px', color: c.isValid ? '#166534' : '#991b1b' }}>
                              {c.isValid ? 'Válido' : c.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedContacts.length > 8 && (
                      <p style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', margin: 0 }}>... y {parsedContacts.length - 8} filas más.</p>
                    )}
                  </div>

                  {isImporting && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(importProgress / validCount) * 100}%`, backgroundColor: '#7c3aed', transition: 'width 0.3s' }}></div>
                      </div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Importando {importProgress} de {validCount}...</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" onClick={() => setIsImportModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button
                  type="button"
                  onClick={handleImportConfirm}
                  disabled={isImporting || validCount === 0}
                  style={{ padding: '8px 16px', backgroundColor: isImporting || validCount === 0 ? '#9ca3af' : '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isImporting || validCount === 0 ? 'not-allowed' : 'pointer' }}
                >
                  {isImporting ? 'Importando...' : `Importar ${validCount} Contactos`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ENVIAR CAMPAÑA EMAIL */}
        {isCampaignModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Enviar Campaña Masiva</h2>
                <button onClick={() => setIsCampaignModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
                  Vas a enviar un correo a <strong>{selectedContactIds.size} contacto(s)</strong> seleccionado(s).
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Selecciona la Plantilla</label>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }}>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" onClick={() => setIsCampaignModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button type="button" onClick={handleSendCampaign} disabled={isSendingCampaign} style={{ padding: '8px 16px', backgroundColor: isSendingCampaign ? '#93c5fd' : '#10b981', color: 'white', border: 'none',borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSendingCampaign ? 'not-allowed' : 'pointer' }}>
                  {isSendingCampaign ? 'Enviando...' : 'Confirmar y Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CAMPAÑA WHATSAPP MASIVA */}
        {isWhatsAppCampaignModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📱 Enviar Campaña WhatsApp
                </h2>
                <button
                  onClick={() => { setIsWhatsAppCampaignModalOpen(false); setWhatsAppCampaignMessage(''); }}
                  style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', border: '1px solid #86efac' }}>
                <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
                  Vas a enviar un mensaje de WhatsApp a <strong>{contacts.filter(c => selectedContactIds.has(c.id) && c.phone).length} contacto(s)</strong> usando una plantilla aprobada por Meta.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  Plantilla a usar
                </label>
                {whatsAppTemplatesLoading ? (
                  <div style={{ padding: '10px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', color: '#6b7280' }}>
                    Cargando plantillas...
                  </div>
                ) : whatsAppTemplates.length === 0 ? (
                  <div style={{ padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #fde047', borderRadius: '6px', fontSize: '13px', color: '#854d0e' }}>
                    ⚠️ No hay plantillas aprobadas.{' '}
                    <Link href="/whatsapp/templates" style={{ color: '#2563eb', fontWeight: '600' }}>
                      Ir a sincronizar con Meta →
                    </Link>
                  </div>
                ) : (
                  <select
                    value={whatsAppCampaignMessage}
                    onChange={(e) => setWhatsAppCampaignMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff',
                      color: '#111827'
                    }}
                  >
                    {whatsAppTemplates.map(template => (
                      <option key={template.metaTemplateId} value={template.name}>
                        📝 {template.name} ({template.variables.length} variables)
                      </option>
                    ))}
                  </select>
                )}
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Solo puedes enviar plantillas aprobadas por Meta para iniciar nuevas conversaciones.
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
                  👁️ Vista previa de la plantilla seleccionada
                </p>
                {(() => {
                  const selectedTemplate = whatsAppTemplates.find(t => t.name === whatsAppCampaignMessage);

                  if (!selectedTemplate) {
                    return (
                      <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                        Selecciona una plantilla para ver la vista previa.
                      </p>
                    );
                  }

                  let previewText = selectedTemplate.previewText;
                  selectedTemplate.variables.forEach(v => {
                    previewText = previewText.replace(
                      new RegExp(`\\{\\{${v.index}\\}\\}`, 'g'),
                      `[${v.example}]`
                    );
                  });

                  return (
                    <div style={{ backgroundColor: '#dcf8c6', padding: '12px', borderRadius: '6px', maxWidth: '100%' }}>
                      {selectedTemplate.headerText && (
                        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#075e54', margin: '0 0 8px' }}>
                          {selectedTemplate.headerText.replace(/\{\{(\d+)\}\}/g, (_, idx) => {
                            const variable = selectedTemplate.variables.find(v => v.index === parseInt(idx, 10));
                            return variable ? `[${variable.example}]` : `[variable ${idx}]`;
                          })}
                        </p>
                      )}
                      <p style={{ fontSize: '13px', color: '#303030', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {previewText}
                      </p>
                      {selectedTemplate.footerText && (
                        <p style={{ fontSize: '11px', color: '#8696a0', margin: '8px 0 0', fontStyle: 'italic' }}>
                          {selectedTemplate.footerText}
                        </p>
                      )}
                      {selectedTemplate.hasButtons && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                          <p style={{ fontSize: '11px', color: '#0088cc', margin: 0, fontWeight: '600' }}>
                            [Botón de respuesta rápida]
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const selectedTemplate = whatsAppTemplates.find(t => t.name === whatsAppCampaignMessage);
                  if (!selectedTemplate || selectedTemplate.variables.length === 0) return null;

                  return (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Variables que se llenarán automáticamente:
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {selectedTemplate.variables.map((v, idx) => (
                          <code
                            key={v.index}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              color: '#7c3aed',
                            }}
                          >
                            {`{{${v.index}}}`} → {getVariableSource(idx)}
                          </code>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #fde047', borderRadius: '6px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#854d0e', margin: 0 }}>
                  ⚠️ <strong>Costo:</strong> Meta cobra ~$0.08 USD por conversación de marketing iniciada.
                </p>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                <button
                  type="button"
                  onClick={() => { setIsWhatsAppCampaignModalOpen(false); setWhatsAppCampaignMessage(''); }}
                  style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppCampaign}
                  disabled={isSendingWhatsAppCampaign || !whatsAppCampaignMessage}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isSendingWhatsAppCampaign || !whatsAppCampaignMessage ? '#9ca3af' : '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isSendingWhatsAppCampaign || !whatsAppCampaignMessage ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSendingWhatsAppCampaign ? 'Enviando...' : '📱 Enviar Campaña'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: AGREGAR A LISTADO */}
        {isAddToListModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '448px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>📋 Agregar a Listado</h2>
                <button onClick={() => setIsAddToListModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f3ff', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                <p style={{ fontSize: '14px', color: '#5b21b6', margin: 0 }}>
                  Vas a agregar <strong>{selectedContactIds.size} contacto(s)</strong> al listado seleccionado.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Selecciona el listado</label>
                <select
                  value={targetListId}
                  onChange={e => setTargetListId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }}
                >
                  {contactLists.map(list => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.contactCount} contactos)
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  ¿Necesitas uno nuevo?{' '}
                  <Link href="/contact-lists" style={{ color: '#2563eb', fontWeight: '600' }}>Crear listado →</Link>
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" onClick={() => setIsAddToListModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button
                  type="button"
                  onClick={handleAddToList}
                  disabled={isAddingToList || !targetListId}
                  style={{ padding: '8px 16px', backgroundColor: isAddingToList || !targetListId ? '#9ca3af' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isAddingToList || !targetListId ? 'not-allowed' : 'pointer' }}
                >
                  {isAddingToList ? 'Agregando...' : 'Agregar al Listado'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
