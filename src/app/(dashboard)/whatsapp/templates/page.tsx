// src/app/(dashboard)/whatsapp/templates/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import { WhatsAppTemplate, TemplateStatus, TemplateCategory } from '@/types/whatsappTemplate.types';

type StatusFilter = 'ALL' | TemplateStatus;

export default function WhatsAppTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [initialized, setInitialized] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada. Recarga la página.');

      const response = await fetch('/api/whatsapp/templates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Error al cargar plantillas');
      }

      setTemplates(result.templates || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al cargar plantillas: ${message}`);
      console.error('[WhatsAppTemplates] Error loading:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized && !authLoading && user) {
      setInitialized(true);
      loadTemplates();
    }
  }, [initialized, authLoading, user, loadTemplates]);

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const response = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'sync' }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Error al sincronizar');
      }

      setSuccessMessage(result.message);
      await loadTemplates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al sincronizar: ${message}`);
      console.error('[WhatsAppTemplates] Error syncing:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: TemplateStatus): string => {
    const colors: Record<TemplateStatus, string> = {
      APPROVED: '#10b981',
      PENDING: '#f59e0b',
      REJECTED: '#ef4444',
      PAUSED: '#6b7280',
      DISABLED: '#6b7280',
      IN_APPEAL: '#8b5cf6',
      DELETED: '#374151',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: TemplateStatus): string => {
    const labels: Record<TemplateStatus, string> = {
      APPROVED: '✅ Activa',
      PENDING: '⏳ En revisión',
      REJECTED: '❌ Rechazada',
      PAUSED: '⏸️ Pausada',
      DISABLED: '🚫 Deshabilitada',
      IN_APPEAL: '📝 En apelación',
      DELETED: '🗑️ Eliminada',
    };
    return labels[status] || status;
  };

  const getCategoryLabel = (category: TemplateCategory): string => {
    const labels: Record<TemplateCategory, string> = {
      MARKETING: '📢 Marketing',
      UTILITY: '🔧 Utilidad',
      AUTHENTICATION: '🔐 Autenticación',
      ACCOUNT_UPDATE: '👤 Actualización',
    };
    return labels[category] || category;
  };

  // Filtrar plantillas según el estado seleccionado
  const filteredTemplates = statusFilter === 'ALL'
    ? templates
    : templates.filter(t => t.status === statusFilter);

  const activeCount = templates.filter(t => t.status === 'APPROVED').length;
  const pendingCount = templates.filter(t => t.status === 'PENDING').length;

  if (authLoading || (isLoading && templates.length === 0)) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <nav style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
            <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>WhatsApp</span>
            <span>/</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>Plantillas</span>
          </nav>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ marginBottom: '8px', fontSize: '30px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
                📱 Plantillas de WhatsApp
              </h1>
              <p style={{ fontSize: '16px', color: '#6b7280' }}>
                Gestiona las plantillas aprobadas por Meta para enviar mensajes masivos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                backgroundColor: isSyncing ? '#9ca3af' : '#25D366',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              {isSyncing ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ animation: 'spin 1s linear infinite' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sincronizando...
                </>
              ) : (
                <>
                  🔄 Sincronizar con Meta
                </>
              )}
            </button>
          </div>
        </div>

        {/* MENSAJES */}
        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '14px', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
            ✅ {successMessage}
          </div>
        )}

        {/* ESTADÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Total</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{templates.length}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Activas</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>{activeCount}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>En revisión</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>{pendingCount}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Última sync</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {templates.length > 0 ? new Date(templates[0].lastSyncedAt).toLocaleString('es-CO') : '-'}
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'PAUSED'] as StatusFilter[]).map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: statusFilter === filter ? '#25D366' : 'white',
                color: statusFilter === filter ? 'white' : '#374151',
                borderColor: statusFilter === filter ? '#25D366' : '#d1d5db',
              }}
            >
              {filter === 'ALL' ? 'Todas' : getStatusLabel(filter as TemplateStatus)}
            </button>
          ))}
        </div>

        {/* LISTA DE PLANTILLAS */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          {filteredTemplates.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📱</p>
              <p style={{ color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>
                {templates.length === 0 ? 'No hay plantillas sincronizadas' : 'No hay plantillas con este estado'}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                {templates.length === 0
                  ? 'Haz clic en "Sincronizar con Meta" para importar las plantillas de tu cuenta de WhatsApp Business.'
                  : 'Intenta con otro filtro.'}
              </p>
            </div>
          ) : (
            <div>
              {filteredTemplates.map((template, index) => (
                <div
                  key={template.metaTemplateId}
                  style={{
                    padding: '20px 24px',
                    borderBottom: index < filteredTemplates.length - 1 ? '1px solid #e5e7eb' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0, fontFamily: 'monospace' }}>
                        {template.name}
                      </h3>
                      <span
                        style={{
                          padding: '2px 10px',
                          backgroundColor: `${getStatusColor(template.status)}20`,
                          color: getStatusColor(template.status),
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {getStatusLabel(template.status)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {getCategoryLabel(template.category)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        🌐 {template.language}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px', lineHeight: '1.5' }}>
                      {template.previewText.substring(0, 100)}
                      {template.previewText.length > 100 ? '...' : ''}
                    </p>

                    {template.variables.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Variables:</span>
                        {template.variables.map(v => (
                          <code
                            key={v.index}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '4px',
                              color: '#374151',
                            }}
                          >
                            {`{{${v.index}}}`} {v.example}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'white',
                        color: '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Ver detalles
                    </button>
                    {template.status === 'APPROVED' && (
                      <Link
                        href="/contacts"
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#25D366',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        📱 Usar en campaña
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL DE DETALLES */}
        {selectedTemplate && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px', fontFamily: 'monospace' }}>
                    {selectedTemplate.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        backgroundColor: `${getStatusColor(selectedTemplate.status)}20`,
                        color: getStatusColor(selectedTemplate.status),
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      {getStatusLabel(selectedTemplate.status)}
                    </span>
                    <span
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      {getCategoryLabel(selectedTemplate.category)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280', alignSelf: 'center' }}>
                      🌐 {selectedTemplate.language}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{
                    color: '#9ca3af',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Preview del mensaje tipo WhatsApp */}
              <div style={{ padding: '24px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
                  👁️ Vista previa (así se verá en WhatsApp)
                </p>

                <div
                  style={{
                    backgroundColor: '#dcf8c6',
                    padding: '16px',
                    borderRadius: '8px',
                    maxWidth: '400px',
                    marginLeft: 'auto',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                  }}
                >
                  {selectedTemplate.headerText && (
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#075e54', margin: '0 0 8px' }}>
                      {selectedTemplate.headerText}
                    </p>
                  )}
                  <p style={{ fontSize: '14px', color: '#303030', margin: '0 0 8px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selectedTemplate.previewText}
                  </p>
                  {selectedTemplate.footerText && (
                    <p style={{ fontSize: '11px', color: '#8696a0', margin: '8px 0 0', fontStyle: 'italic' }}>
                      {selectedTemplate.footerText}
                    </p>
                  )}
                  {selectedTemplate.hasButtons && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                      <button
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'transparent',
                          color: '#0088cc',
                          border: '1px solid #0088cc',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'default',
                        }}
                      >
                        [Botón de respuesta]
                      </button>
                    </div>
                  )}
                </div>

                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
                      📋 Variables dinámicas
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                      {selectedTemplate.variables.map(v => (
                        <div
                          key={v.index}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <code style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>
                            {`{{${v.index}}}`}
                          </code>
                          <p style={{ fontSize: '13px', color: '#374151', margin: '4px 0 0' }}>
                            Ejemplo: <strong>{v.example}</strong>
                          </p>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
                            En {v.location}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                    <strong>ID Meta:</strong> {selectedTemplate.metaTemplateId}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                    <strong>Última sincronización:</strong> {new Date(selectedTemplate.lastSyncedAt).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
                {selectedTemplate.status === 'APPROVED' && (
                  <Link
                    href="/contacts"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#25D366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    📱 Usar en campaña
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}