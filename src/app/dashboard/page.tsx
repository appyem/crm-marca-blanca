// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está cargando y no hay usuario, redirigir al login
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Mostrar loading mientras verifica la autenticación
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </main>
    );
  }

  // Si no hay usuario después de cargar, no renderizar nada (ya se redirigió)
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await authService.logOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-600">Bienvenido, {user.displayName || user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Información del Usuario</h2>
            <dl className="mt-4 space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Rol</dt>
                <dd className="text-sm text-gray-900">{user.role}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                <dd className="text-sm text-gray-900">{user.tenantId}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Estadísticas</h2>
            <p className="mt-4 text-sm text-gray-600">Próximamente...</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
            <p className="mt-4 text-sm text-gray-600">Próximamente...</p>
          </div>
        </div>
      </div>
    </main>
  );
}