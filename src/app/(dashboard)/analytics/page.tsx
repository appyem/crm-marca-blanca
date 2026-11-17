// src/app/(dashboard)/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { emailService } from '@/services/email.service';
import { EmailLog, EmailStats, EmailStatus, EmailTemplate } from '@/types/email.types';

type DateRange = '7days' | '30days' | '90days' | 'custom';

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | ''>('');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const getDateRange = (): { startDate: string; endDate: string } => {
    const endDate = new Date().toISOString();
    let startDate: Date;

    switch (dateRange) {
      case '7days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'custom':
        return {
          startDate: customStartDate ? new Date(customStartDate).toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: customEndDate ? new Date(customEndDate).toISOString() : endDate,
        };
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate: startDate.toISOString(), endDate };
  };

  const loadData = async () => {
    if (!user) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
      const dateRangeObj = getDateRange();
      const queryData = {
        startDate: dateRangeObj.startDate,
        endDate: dateRangeObj.endDate,
        status: statusFilter || undefined,
        templateId: templateFilter || undefined,
      };

      const [statsData, logsData, templatesData] = await Promise.all([
        emailService.getEmailStats(user.tenantId, queryData),
        emailService.getEmailLogsWithFilters(user.tenantId, queryData, 100),
        emailService.getActiveTemplatesByTenant(user.tenantId),
      ]);

      setStats(statsData);
      setLogs(logsData);
      if (templates.length === 0) setTemplates(templatesData);
    } catch (err) {
      setError('Error al cargar las analíticas. Verifica que tengas correos enviados en este rango.');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, dateRange, customStartDate, customEndDate, statusFilter, templateFilter]);

  const getStatusBadge = (status: EmailStatus) => {
    const styles: Record<EmailStatus, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      OPENED: 'bg-indigo-100 text-indigo-800',
      CLICKED: 'bg-purple-100 text-purple-800',
      BOUNCED: 'bg-orange-100 text-orange-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.to.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Analíticas de Email</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Analíticas de Email</h1>
          <p className="mt-1 text-gray-600">Monitorea el rendimiento de tus campañas de correo.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm border border-gray-100">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Selector de rango */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rango de fechas</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="7days">Últimos 7 días</option>
                <option value="30days">Últimos 30 días</option>
                <option value="90days">Últimos 90 días</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Fecha inicio (solo si es custom) */}
            {dateRange === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Fecha fin (solo si es custom) */}
            {dateRange === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Filtro por estado */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EmailStatus | '')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="SENT">Enviados</option>
                <option value="DELIVERED">Entregados</option>
                <option value="OPENED">Abiertos</option>
                <option value="CLICKED">Clickeados</option>
                <option value="BOUNCED">Rebotados</option>
                <option value="FAILED">Fallidos</option>
              </select>
            </div>

            {/* Filtro por plantilla */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Plantilla</label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Total Enviados */}
            <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Enviados</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalSent}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <span className="text-2xl">📨</span>
                </div>
              </div>
            </div>

            {/* Entregados */}
            <div className="rounded-lg bg-white p-6 shadow-sm border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Entregados</p>
                  <p className="mt-2 text-3xl font-bold text-green-700">{stats.delivered}</p>
                  <p className="mt-1 text-xs text-green-600">{stats.deliveryRate}% tasa</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            {/* Abiertos */}
            <div className="rounded-lg bg-white p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Abiertos</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">{stats.opened}</p>
                  <p className="mt-1 text-xs text-blue-600">{stats.openRate}% tasa</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl">👁️</span>
                </div>
              </div>
            </div>

            {/* Clics */}
            <div className="rounded-lg bg-white p-6 shadow-sm border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Clics</p>
                  <p className="mt-2 text-3xl font-bold text-purple-700">{stats.clicked}</p>
                  <p className="mt-1 text-xs text-purple-600">{stats.clickRate}% tasa</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-2xl">🖱️</span>
                </div>
              </div>
            </div>

            {/* Rebotes/Fallidos */}
            <div className="rounded-lg bg-white p-6 shadow-sm border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Problemas</p>
                  <p className="mt-2 text-3xl font-bold text-red-700">{stats.bounced + stats.failed}</p>
                  <p className="mt-1 text-xs text-red-600">{stats.bounceRate}% rebote</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por email o asunto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Tabla de correos */}
        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100">
          {isFetching ? (
            <div className="p-8 text-center text-gray-600">Cargando correos...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No hay correos en el rango seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Destinatario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asunto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Abierto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Clics</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{log.to}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{log.subject}</td>
                      <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.openCount || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.clickCount || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link 
                          href={`/analytics/${log.id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}