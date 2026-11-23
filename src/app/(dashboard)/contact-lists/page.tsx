// src/app/(dashboard)/contact-lists/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import { ContactList, LIST_COLORS } from '@/types/contactList.types';

interface ListFormData {
  name: string;
  description: string;
  color: string;
}

export default function ContactListsPage() {
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ContactList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState<ListFormData>({
    name: '',
    description: '',
    color: LIST_COLORS[0],
  });

  const loadLists = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/contact-lists', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setLists(result.lists);
      }
    } catch (err) {
      console.error('[ContactLists] Error cargando:', err);
      setError('Error al cargar los listados.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized && !authLoading && user) {
      setInitialized(true);
      loadLists();
    }
  }, [initialized, authLoading, user, loadLists]);

  const openCreateModal = () => {
    setEditingList(null);
    setFormData({ name: '', description: '', color: LIST_COLORS[0] });
    setIsModalOpen(true);
  };

  const openEditModal = (list: ContactList) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || '',
      color: list.color,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const url = editingList
        ? `/api/contact-lists/${editingList.id}`
        : '/api/contact-lists';

      const response = await fetch(url, {
        method: editingList ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al guardar el listado');
      }

      setSuccessMessage(editingList ? 'Listado actualizado correctamente.' : 'Listado creado correctamente.');
      setIsModalOpen(false);
      await loadLists();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (list: ContactList) => {
    if (!user) return;
    if (!confirm(`¿Eliminar el listado "${list.name}"? Los contactos NO se eliminan, solo se quitan del listado.`)) return;

    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const response = await fetch(`/api/contact-lists/${list.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar el listado');

      setSuccessMessage('Listado eliminado correctamente.');
      await loadLists();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    }
  };

  if (authLoading || (isLoading && lists.length === 0)) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <nav style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
              <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
              <span>/</span>
              <span style={{ fontWeight: '500', color: '#111827' }}>Listados de Contactos</span>
            </nav>
            <h1 style={{ marginBottom: '8px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>📋 Listados de Contactos</h1>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
              Organiza tus contactos en grupos para filtrar y enviar campañas segmentadas.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            ➕ Nuevo Listado
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>{error}</div>
        )}
        {successMessage && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '14px', border: '1px solid #bbf7d0', borderRadius: '6px' }}>✅ {successMessage}</div>
        )}

        {lists.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📋</p>
            <p style={{ color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>No hay listados creados aún.</p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Crea tu primer listado para organizar contactos por municipio, tipo o campaña.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {lists.map(list => (
              <div key={list.id} style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', borderTop: `4px solid ${list.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>{list.name}</h3>
                  <span style={{ backgroundColor: `${list.color}20`, color: list.color, fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                    {list.contactCount} contactos
                  </span>
                </div>
                {list.description && (
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5 }}>{list.description}</p>
                )}
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 16px' }}>
                  Creado: {new Date(list.createdAt).toLocaleDateString('es-CO')}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link
                    href={`/contacts?list=${list.id}`}
                    style={{ padding: '6px 12px', backgroundColor: list.color, color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
                  >
                    👥 Ver contactos
                  </Link>
                  <button
                    onClick={() => openEditModal(list)}
                    style={{ padding: '6px 12px', backgroundColor: 'white', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(list)}
                    style={{ padding: '6px 12px', backgroundColor: 'white', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL CREAR/EDITAR LISTADO */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '448px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                  {editingList ? 'Editar Listado' : 'Nuevo Listado'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre del listado *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Alcaldías Caldas"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#111827' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Descripción (opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ej: 27 alcaldes del departamento de Caldas"
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#111827', resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Color identificador</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {LIST_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: formData.color === color ? '3px solid #111827' : '3px solid transparent',
                          cursor: 'pointer',
                        }}
                        aria-label={`Color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={isSubmitting || !formData.name.trim()} style={{ padding: '8px 16px', backgroundColor: isSubmitting || !formData.name.trim() ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSubmitting || !formData.name.trim() ? 'not-allowed' : 'pointer' }}>
                    {isSubmitting ? 'Guardando...' : (editingList ? 'Actualizar' : 'Crear')}
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
