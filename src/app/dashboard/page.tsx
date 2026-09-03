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
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          
          {/* Tarjeta 1: Contactos */}
          <Link 
            href="/contacts" 
            style={{ display: 'block', padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', textDecoration: 'none', transition: 'box-shadow 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Contactos y Leads</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Gestiona tu base de datos de clientes, prospectos y leads.</p>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>Ver contactos →</span>
          </Link>

          {/* Tarjeta 2: Empresas */}
          <Link 
            href="/companies" 
            style={{ display: 'block', padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', textDecoration: 'none', transition: 'box-shadow 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Empresas</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Gestiona las empresas y organizaciones con las que trabajas.</p>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>Ver empresas →</span>
          </Link>

          {/* Tarjeta 3: Oportunidades */}
          <Link 
            href="/opportunities" 
            style={{ display: 'block', padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', textDecoration: 'none', transition: 'box-shadow 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Oportunidades</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Gestiona tu pipeline comercial y sigue el progreso de tus ventas.</p>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>Ver pipeline →</span>
          </Link>

          {/* Tarjeta 4: Plantillas de Correo (NUEVA) */}
          <Link 
            href="/email" 
            style={{ display: 'block', padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', textDecoration: 'none', transition: 'box-shadow 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Plantillas de Correo</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Crea y gestiona plantillas de email con variables dinámicas.</p>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>Ver plantillas →</span>
          </Link>

        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
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