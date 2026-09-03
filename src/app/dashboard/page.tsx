// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
            
            {/* BOTONES DE PRUEBA DE SEGURIDAD (Solo para SUPER_ADMIN) */}
            {user.role === 'SUPER_ADMIN' && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const { collection, addDoc } = await import('firebase/firestore');
                      const { db } = await import('@/lib/firebase/client');
                      const docRef = await addDoc(collection(db, 'tenants', user.tenantId, 'test'), {
                        message: 'Prueba de aislamiento legítima',
                        timestamp: new Date()
                      });
                      alert('✅ ÉXITO: Documento creado en TU tenant: ' + docRef.id);
                    } catch (error) {
                      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Error desconocido'));
                    }
                  }}
                  className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  ✅ Probar MI Tenant
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { collection, addDoc } = await import('firebase/firestore');
                      const { db } = await import('@/lib/firebase/client');
                      // Intentar escribir en un tenant que NO es el tuyo
                      const docRef = await addDoc(collection(db, 'tenants', 'otro-tenant-falso', 'test'), {
                        message: 'Intento de hackeo',
                        timestamp: new Date()
                      });
                      alert('🚨 VULNERABILIDAD: ¡Se permitió acceso cruzado! ID: ' + docRef.id);
                    } catch (error) {
                      alert('🔒 SEGURIDAD OK: Acceso denegado a otro tenant.\n\n' + (error instanceof Error ? error.message : 'Error desconocido'));
                    }
                  }}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  🚨 Probar OTRO Tenant (Hack)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {user.role === 'SUPER_ADMIN' && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900">Panel de Super Administrador</h3>
            <p className="mt-1 text-sm text-blue-700">
              Gestiona la plataforma global, crea nuevos tenants y configura límites.
            </p>
            <Link 
              href="/tenants/new" 
              className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Crear Nuevo Tenant
            </Link>
          </div>
        )}

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