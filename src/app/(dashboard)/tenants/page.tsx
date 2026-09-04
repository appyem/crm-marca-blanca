// src/app/(dashboard)/tenants/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService } from '@/services/tenant.service';
import { Tenant, TenantStatus, TenantPlan } from '@/types/tenant.types';

export default function TenantsListPage() {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para modales
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [statsTenant, setStatsTenant] = useState<{ tenant: Tenant; stats: { emailsSent: number } | null } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role === 'SUPER_ADMIN') {
      loadTenants();
    }
  }, [authLoading, user]);

  const loadTenants = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const data = await tenantService.getAllTenants();
      setTenants(data);
    } catch (err) {
      setError('Error al cargar la lista de tenants.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDelete = async (tenantId: string, tenantName: string) => {
    const confirmMsg = `⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás seguro de eliminar a "${tenantName}"?\n\nNota: Esto eliminará el registro principal del tenant. Las subcolecciones (contactos, usuarios, logs) permanecerán en la base de datos y deberán limpiarse manualmente o mediante una Cloud Function.`;
    if (!confirm(confirmMsg)) return;
    
    try {
      await tenantService.deleteTenant(tenantId);
      await loadTenants();
      alert('Tenant eliminado (verifica las subcolecciones manualmente).');
    } catch (err) {
      alert('Error al eliminar el tenant.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSubmitting(true);
    try {
      // Si cambió el plan, usamos updateTenantPlan para que actualice los límites automáticamente
      if (editingTenant.plan !== (e.target as any).plan.value) {
        await tenantService.updateTenantPlan(editingTenant.id, (e.target as any).plan.value as TenantPlan);
      }
      // Actualizamos nombre y dominio
      await tenantService.updateTenant(editingTenant.id, {
        name: (e.target as any).name.value,
        domain: (e.target as any).domain.value,
      });
      setEditingTenant(null);
      await loadTenants();
      alert('Tenant actualizado exitosamente.');
    } catch (err) {
      alert('Error al actualizar el tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStats = async (tenant: Tenant) => {
    setStatsTenant({ tenant, stats: null });
    try {
      const stats = await tenantService.getTenantStats(tenant.id);
      setStatsTenant({ tenant, stats });
    } catch (err) {
      console.error('Error cargando stats:', err);
    }
  };

  if (authLoading || isFetching) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-gray-600">Cargando tenants...</p></div>;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-red-600">Acceso denegado. Se requiere rol SUPER_ADMIN.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="font-medium text-gray-900">Gestión de Tenants</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900">Empresas (Tenants)</h1>
            <p className="mt-1 text-gray-600">Administra planes, límites, estadísticas y estados.</p>
          </div>
          <Link href="/tenants/new" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            ➕ Crear Nuevo Tenant
          </Link>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    <div className="text-xs text-gray-500">{tenant.domain || 'Sin dominio'}</div>
                    <div className="text-xs text-gray-400">ID: {tenant.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tenant.plan === 'BUSINESS' ? 'bg-blue-100 text-blue-800' : tenant.plan === 'FREE' ? 'bg-gray-100 text-gray-800' : 'bg-purple-100 text-purple-800'}`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tenant.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      <button onClick={() => openStats(tenant)} className="text-indigo-600 hover:text-indigo-900">📊 Stats</button>
                      <button onClick={() => setEditingTenant(tenant)} className="text-blue-600 hover:text-blue-900">Editar</button>
                      <button onClick={() => tenantService.updateTenantStatus(tenant.id, tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE').then(loadTenants)} className="text-yellow-600 hover:text-yellow-900">
                        {tenant.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                      </button>
                      <button onClick={() => handleDelete(tenant.id, tenant.name)} className="text-red-600 hover:text-red-900">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ESTADÍSTICAS */}
      {statsTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Estadísticas: {statsTenant.tenant.name}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Plan Actual:</span>
                <span className="font-semibold">{statsTenant.tenant.plan}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Correos Enviados (Total):</span>
                <span className="font-semibold">{statsTenant.stats ? statsTenant.stats.emailsSent : 'Cargando...'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Límite Emails/Mes:</span>
                <span className="font-semibold">{statsTenant.tenant.limits?.maxEmailsPerMonth?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Límite Usuarios:</span>
                <span className="font-semibold">{statsTenant.tenant.limits?.maxUsers || 'N/A'}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setStatsTenant(null)} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN / CAMBIO DE PLAN */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Editar Tenant: {editingTenant.name}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
                <input name="name" defaultValue={editingTenant.name} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dominio</label>
                <input name="domain" defaultValue={editingTenant.domain} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan (Cambia los límites automáticamente)</label>
                <select name="plan" defaultValue={editingTenant.plan} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="FREE">FREE</option>
                  <option value="BASIC">BASIC</option>
                  <option value="PRO">PRO</option>
                  <option value="BUSINESS">BUSINESS</option>
                  <option value="WHITE_LABEL">WHITE_LABEL</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingTenant(null)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}