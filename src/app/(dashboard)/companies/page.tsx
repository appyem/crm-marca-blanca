// src/app/(dashboard)/companies/page.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { crmService } from '@/services/crm.service';
import { Company } from '@/types/crm.types';

export default function CompaniesPage() {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    sector: '',
    city: '',
    country: '',
  });

  const loadCompanies = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    setError(null);
    try {
      const data = await crmService.getCompaniesByTenant(user.tenantId);
      setCompanies(data);
    } catch (err) {
      setError('Error al cargar las empresas.');
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  if (!initialized && !authLoading && user) {
    setInitialized(true);
    loadCompanies();
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await crmService.createCompany(user.tenantId, {
        name: formData.name,
        domain: formData.domain,
        sector: formData.sector,
        city: formData.city,
        country: formData.country,
        tags: [],
        ownerId: user.uid,
      });
      setFormData({ name: '', domain: '', sector: '', city: '', country: '' });
      setIsModalOpen(false);
      await loadCompanies();
    } catch (err) {
      setError('Error al crear la empresa.');
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
        
        <div style={{ marginBottom: '32px' }}>
          <nav style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
            <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>Empresas</span>
          </nav>
          
          <h1 style={{ marginBottom: '8px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Gestión de Empresas</h1>
          <p style={{ marginBottom: '16px', fontSize: '16px', color: '#6b7280' }}>Administra las empresas con las que trabajas.</p>
          
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
              gap: '8px'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Empresa
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          {companies.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontWeight: '500' }}>No hay empresas registradas aún.</p>
              <button 
                onClick={() => setIsModalOpen(true)} 
                style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crea tu primera empresa
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Nombre</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Dominio</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Sector</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Ciudad</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>País</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{company.name}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{company.domain || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{company.sector || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{company.city || '-'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{company.country || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '448px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Nueva Empresa</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Nombre</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Dominio Web</label>
                  <input type="text" name="domain" value={formData.domain} onChange={handleInputChange} placeholder="ejemplo.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Sector</label>
                  <input type="text" name="sector" value={formData.sector} onChange={handleInputChange} placeholder="Tecnología, Salud, Educación..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Ciudad</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>País</label>
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
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