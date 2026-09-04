// src/app/(dashboard)/tenants/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';

export default function NewTenantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tenantName: '',
    domain: '',
    plan: 'BUSINESS',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

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
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada');

      const response = await fetch('/api/admin/create-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantName: formData.tenantName,
          domain: formData.domain,
          plan: formData.plan,
          limits: { maxUsers: 200, maxContacts: 100000, maxEmailsPerMonth: 500000 }, // Valores por defecto, ajustables
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el tenant');
      }

      alert('✅ Tenant y usuario administrador creados exitosamente.');
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>Crear Nuevo Tenant y Administrador</h1>
        
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', borderRadius: '6px', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Datos de la Empresa (Tenant)</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre de la Empresa *</label>
            <input type="text" name="tenantName" required value={formData.tenantName} onChange={handleInputChange} placeholder="Ej: Appyempresa S.A.S" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Dominio (opcional)</label>
            <input type="text" name="domain" value={formData.domain} onChange={handleInputChange} placeholder="Ej: appyempresa.digital" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Plan</label>
            <select name="plan" value={formData.plan} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }}>
              <option value="FREE">Free</option>
              <option value="BUSINESS">Business</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Datos del Primer Administrador</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre Completo *</label>
            <input type="text" name="adminName" required value={formData.adminName} onChange={handleInputChange} placeholder="Ej: Juan Pérez" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Correo Electrónico *</label>
            <input type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleInputChange} placeholder="admin@empresa.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Contraseña Temporal *</label>
            <input type="password" name="adminPassword" required value={formData.adminPassword} onChange={handleInputChange} placeholder="Mínimo 6 caracteres" minLength={6} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#111827' }} />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>El usuario deberá cambiar esta contraseña en su primer inicio de sesión.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
            <button type="button" onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Creando...' : 'Crear Tenant y Usuario'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}