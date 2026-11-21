// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { emailService } from '@/services/email.service';
import { EmailStats } from '@/types/email.types';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    // Si no está cargando y no hay usuario, redirigir al login
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Cargar estadísticas de email de los últimos 7 días
  useEffect(() => {
    if (user && user.tenantId) {
      loadEmailStats();
    }
  }, [user]);

  const loadEmailStats = async () => {
    if (!user?.tenantId) return;
    
    setStatsLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const stats = await emailService.getEmailStats(user.tenantId, {
        startDate: startDate.toISOString(),
        endDate,
      });
      
      setEmailStats(stats);
    } catch (err) {
      console.error('Error cargando stats de email:', err);
    } finally {
      setStatsLoading(false);
    }
  };

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

        {/* PANEL EXCLUSIVO PARA SUPER ADMIN */}
        {user.role === 'SUPER_ADMIN' && (
          <div className="mb-8 rounded-lg bg-blue-50 p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              👑 Panel de Super Administrador
            </h3>
            <p className="mt-2 text-sm text-blue-700">
              Tienes control total sobre la plataforma. Gestiona las empresas (tenants), sus planes, límites y estados.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link 
                href="/tenants" 
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                📋 Ver Lista de Tenants
              </Link>
              <Link 
                href="/tenants/new" 
                className="inline-flex items-center rounded-md bg-white border border-blue-300 text-blue-700 px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm"
              >
                ➕ Crear Nuevo Tenant
              </Link>
            </div>
          </div>
        )}

        {/* WIDGET DE RESUMEN DE EMAIL */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">📊 Resumen de Email</h2>
              <p className="text-sm text-gray-600">Estadísticas de los últimos 7 días</p>
            </div>
            <Link 
              href="/analytics" 
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Ver analíticas completas →
            </Link>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando estadísticas...</span>
            </div>
          ) : emailStats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Total Enviados */}
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Enviados</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{emailStats.totalSent}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <span className="text-xl">📨</span>
                  </div>
                </div>
              </div>

              {/* Entregados */}
              <div className="rounded-lg bg-white p-4 shadow-sm border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600">Entregados</p>
                    <p className="mt-1 text-2xl font-bold text-green-700">{emailStats.delivered}</p>
                    <p className="mt-1 text-xs text-green-600">{emailStats.deliveryRate}%</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <span className="text-xl">✅</span>
                  </div>
                </div>
              </div>


                        <Link 
            href="/email" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">Plantillas de Correo</h2>
            <p className="mt-2 text-sm text-gray-600">Crea y gestiona plantillas de email con variables dinámicas.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver plantillas →</span>
          </Link>

          <Link 
            href="/whatsapp/templates" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">📱 Plantillas de WhatsApp</h2>
            <p className="mt-2 text-sm text-gray-600">Gestiona las plantillas aprobadas por Meta para enviar mensajes masivos.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver plantillas →</span>
          </Link>

          <Link 
            href="/analytics" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">📊 Analíticas de Email</h2>
            <p className="mt-2 text-sm text-gray-600">Monitorea el rendimiento de tus campañas con métricas detalladas.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver analíticas →</span>
          </Link>

              {/* Abiertos */}
              <div className="rounded-lg bg-white p-4 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600">Abiertos</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{emailStats.opened}</p>
                    <p className="mt-1 text-xs text-blue-600">{emailStats.openRate}%</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-xl">👁️</span>
                  </div>
                </div>
              </div>

              {/* Clics */}
              <div className="rounded-lg bg-white p-4 shadow-sm border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600">Clics</p>
                    <p className="mt-1 text-2xl font-bold text-purple-700">{emailStats.clicked}</p>
                    <p className="mt-1 text-xs text-purple-600">{emailStats.clickRate}%</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <span className="text-xl">🖱️</span>
                  </div>
                </div>
              </div>

              {/* Problemas */}
              <div className="rounded-lg bg-white p-4 shadow-sm border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-red-600">Problemas</p>
                    <p className="mt-1 text-2xl font-bold text-red-700">{emailStats.bounced + emailStats.failed}</p>
                    <p className="mt-1 text-xs text-red-600">{emailStats.bounceRate}% rebote</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <span className="text-xl">⚠️</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>No hay datos de email disponibles.</p>
              <p className="text-sm mt-2">Envía tu primera campaña para ver las estadísticas aquí.</p>
            </div>
          )}
        </div>

        {/* TARJETAS DE NAVEGACIÓN PRINCIPALES */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link 
            href="/contacts" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">Contactos y Leads</h2>
            <p className="mt-2 text-sm text-gray-600">Gestiona tu base de datos de clientes, prospectos y envía campañas masivas.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver contactos →</span>
          </Link>

          <Link 
            href="/companies" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">Empresas</h2>
            <p className="mt-2 text-sm text-gray-600">Gestiona las organizaciones y vincúlalas a tus contactos.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver empresas →</span>
          </Link>

          <Link 
            href="/opportunities" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">Oportunidades</h2>
            <p className="mt-2 text-sm text-gray-600">Gestiona tu pipeline comercial y sigue el progreso de tus ventas.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver pipeline →</span>
          </Link>

          <Link 
            href="/email" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">Plantillas de Correo</h2>
            <p className="mt-2 text-sm text-gray-600">Crea y gestiona plantillas de email con variables dinámicas.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver plantillas →</span>
          </Link>

          <Link 
            href="/analytics" 
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900">📊 Analíticas de Email</h2>
            <p className="mt-2 text-sm text-gray-600">Monitorea el rendimiento de tus campañas con métricas detalladas.</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Ver analíticas →</span>
          </Link>
        </div>

        {/* INFORMACIÓN DEL USUARIO */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Información de la Sesión</h2>
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
                <dd className="text-sm text-gray-900">{user.tenantId || 'N/A (Super Admin)'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}