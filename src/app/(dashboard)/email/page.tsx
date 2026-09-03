// src/app/(dashboard)/email/page.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import { emailService, renderTemplate } from '@/services/email.service';
import { EmailTemplate } from '@/types/email.types';

export default function EmailTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    variables: '', 
  });

  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  // Estado para el modal de prueba de envío
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    setError(null);
    try {
      const data = await emailService.getActiveTemplatesByTenant(user.tenantId);
      setTemplates(data);
    } catch (err) {
      setError('Error al cargar las plantillas. Verifica que el índice de Firestore esté creado.');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized && !authLoading && user) {
      setInitialized(true);
      loadData();
    }
  }, [initialized, authLoading, user, loadData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'body' || name === 'variables') {
      const vars = formData.variables.split(',').map(v => v.trim()).filter(v => v);
      const sampleData: Record<string, string> = {};
      vars.forEach(v => { sampleData[v] = `[${v}]`; });
      setPreviewData(sampleData);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const variablesArray = formData.variables
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      await emailService.createTemplate(user.tenantId, {
        name: formData.name,
        subject: formData.subject,
        body: formData.body,
        variables: variablesArray,
        isActive: true,
      });

      setFormData({ name: '', subject: '', body: '', variables: '' });
      setPreviewData({});
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError('Error al crear la plantilla.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTestModal = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    const initialVars: Record<string, string> = {};
    template.variables.forEach(v => { initialVars[v] = ''; });
    setTestVariables(initialVars);
    setTestEmail(user?.email || '');
    setIsTestModalOpen(true);
  };

  const handleTestVariableChange = (key: string, value: string) => {
    setTestVariables(prev => ({ ...prev, [key]: value }));
  };

    const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !user) return;

    setIsSendingTest(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No se pudo obtener el token de sesión. Por favor recarga la página.');
      
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          to: testEmail,
          subject: selectedTemplate.subject,
          bodyText: selectedTemplate.body,
          variables: testVariables,
        }),
      });

      // Intentar leer el error como texto primero por si no es JSON válido
      const textResponse = await response.text();
      
      let result;
      try {
        result = JSON.parse(textResponse);
      } catch {
        // Si no es JSON, es un error de Next.js o HTML
        throw new Error(`El servidor devolvió un error inesperado (Status: ${response.status}). Revisa la terminal de npm run dev.`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Error del servidor (${response.status})`);
      }

      alert('✅ ¡Correo de prueba enviado exitosamente! Revisa tu bandeja de entrada (y la carpeta de Spam).');
      setIsTestModalOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al enviar.';
      setError(errorMessage);
      console.error('Error capturado en frontend:', err);
    } finally {
      setIsSendingTest(false);
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
        
        <div style={{ marginBottom: '32px' }}>
          <nav style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
            <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>Email</span>
          </nav>
          
          <h1 style={{ marginBottom: '8px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Plantillas de Correo</h1>
          <p style={{ marginBottom: '16px', fontSize: '16px', color: '#6b7280' }}>Crea, gestiona y prueba plantillas reutilizables con variables dinámicas.</p>
          
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Plantilla
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>{error}</div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          {templates.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontWeight: '500' }}>No hay plantillas registradas aún.</p>
              <button onClick={() => setIsModalOpen(true)} style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Crea tu primera plantilla</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Nombre</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Asunto</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Variables</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{template.name}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{template.subject}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                        {template.variables.map(v => (
                          <span key={v} style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '12px', marginRight: '4px', marginBottom: '4px' }}>
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                        <button 
                          onClick={() => openTestModal(template)}
                          style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Enviar Prueba
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: CREAR PLANTILLA */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Nueva Plantilla</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre de la Plantilla</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ej: Bienvenida Nuevo Cliente" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Asunto del Correo</label>
                  <input type="text" name="subject" required value={formData.subject} onChange={handleInputChange} placeholder="Ej: ¡Bienvenido a {{empresa}}!" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Variables (separadas por coma)</label>
                  <input type="text" name="variables" value={formData.variables} onChange={handleInputChange} placeholder="Ej: nombre, empresa, plan" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Se usarán para reemplazar {'{{variable}}'} en el asunto y el cuerpo.</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Cuerpo del Correo (HTML o Texto)</label>
                  <textarea name="body" required value={formData.body} onChange={handleInputChange} rows={6} placeholder="Ej: Hola {{nombre}}, gracias por unirte a {{empresa}}." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827', fontFamily: 'monospace' }} />
                </div>
                
                {formData.body && (
                  <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Vista Previa del Cuerpo</p>
                    <p style={{ fontSize: '14px', color: '#111827', whiteSpace: 'pre-wrap' }}>
                      {renderTemplate(formData.body, previewData)}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ENVIAR PRUEBA */}
        {isTestModalOpen && selectedTemplate && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Enviar Prueba: {selectedTemplate.name}</h2>
                <button onClick={() => setIsTestModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <form onSubmit={handleSendTest}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Correo de Destino</label>
                  <input 
                    type="email" 
                    required 
                    value={testEmail} 
                    onChange={(e) => setTestEmail(e.target.value)} 
                    placeholder="tu-correo@ejemplo.com" 
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} 
                  />
                </div>

                {selectedTemplate.variables.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Valores para las Variables</label>
                    {selectedTemplate.variables.map(v => (
                      <div key={v} style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{`{{${v}}}`}</label>
                        <input 
                          type="text" 
                          value={testVariables[v] || ''} 
                          onChange={(e) => handleTestVariableChange(v, e.target.value)} 
                          placeholder={`Valor para ${v}`}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  <button type="button" onClick={() => setIsTestModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={isSendingTest} style={{ padding: '8px 16px', backgroundColor: isSendingTest ? '#93c5fd' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSendingTest ? 'not-allowed' : 'pointer' }}>
                    {isSendingTest ? 'Enviando...' : 'Enviar Correo de Prueba'}
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