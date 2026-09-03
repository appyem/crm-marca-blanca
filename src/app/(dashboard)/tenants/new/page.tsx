// src/app/(dashboard)/tenants/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService } from '@/services/tenant.service';
import { TenantPlan } from '@/types/tenant.types';

export default function NewTenantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState<TenantPlan>('FREE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Protección básica: solo SUPER_ADMIN debería ver esto
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="mt-2 text-gray-600">Solo los Super Administradores pueden crear tenants.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Volver al Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await tenantService.createTenant(name, domain, plan);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el tenant';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Volver al Dashboard
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Tenant</h1>
          <p className="mt-1 text-gray-600">Registra una nueva empresa en la plataforma SaaS.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre de la Empresa
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="Ej: Mi Empresa S.A.S."
            />
          </div>

          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
              Dominio (identificador único)
            </label>
            <input
              id="domain"
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="Ej: mi-empresa"
            />
            <p className="mt-1 text-xs text-gray-500">
              Se usará para generar el ID del tenant. Solo letras minúsculas y guiones.
            </p>
          </div>

          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
              Plan
            </label>
            <select
              id="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as TenantPlan)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            >
              <option value="FREE">Free (Gratuito)</option>
              <option value="BASIC">Basic (Básico)</option>
              <option value="PRO">Pro (Profesional)</option>
              <option value="BUSINESS">Business (Empresarial)</option>
              <option value="WHITE_LABEL">White Label (Marca Blanca)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear Tenant'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}