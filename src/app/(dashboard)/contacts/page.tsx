// src/app/(dashboard)/contacts/page.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { crmService } from '@/services/crm.service';
import { Contact, ContactType } from '@/types/crm.types';

export default function ContactsPage() {
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: 'LEAD' as ContactType,
  });

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    setError(null);
    try {
      const data = await crmService.getContactsByTenant(user.tenantId);
      setContacts(data);
    } catch (err) {
      setError('Error al cargar los contactos.');
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  if (!initialized && !authLoading && user) {
    setInitialized(true);
    loadContacts();
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await crmService.createContact(user.tenantId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        type: formData.type,
        ownerId: user.uid,
        tags: [],
        consent: true,
        status: 'NUEVO',
      });
      setFormData({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD' });
      setIsModalOpen(false);
      await loadContacts();
    } catch (err) {
      setError('Error al crear el contacto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isFetching) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* CABECERA */}
        <div style={{ marginBottom: '32px' }}>
          <nav style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
            <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>Contactos</span>
          </nav>
          
          <h1 style={{ marginBottom: '8px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Gestión de Contactos</h1>
          <p style={{ marginBottom: '16px', fontSize: '16px', color: '#6b7280' }}>Administra tus leads, prospectos y clientes.</p>
          
          {/* BOTÓN CON ESTILOS INLINE - IMPOSIBLE QUE FALLE */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Contacto
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        {/* TABLA */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          {contacts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontWeight: '500' }}>No hay contactos registrados aún.</p>
              <button 
                onClick={() => setIsModalOpen(true)} 
                style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crea tu primer contacto
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Nombre</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Tipo</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Email</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Teléfono</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{contact.firstName} {contact.lastName}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '2px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: contact.type === 'CLIENT' ? '#dcfce7' : contact.type === 'PROSPECT' ? '#dbeafe' : '#fef3c7',
                          color: contact.type === 'CLIENT' ? '#166534' : contact.type === 'PROSPECT' ? '#1e40af' : '#854d0e'
                        }}>
                          {contact.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.email || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.phone || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{contact.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '448px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'spaceBetween', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Nuevo Contacto</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Apellido</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Teléfono</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Tipo</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                    <option value="LEAD">Lead</option>
                    <option value="PROSPECT">Prospecto</option>
                    <option value="CLIENT">Cliente</option>
                  </select>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}