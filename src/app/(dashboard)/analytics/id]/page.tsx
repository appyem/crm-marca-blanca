// src/app/(dashboard)/analytics/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { emailService } from '@/services/email.service';
import { EmailLog, EmailEventLog } from '@/types/email.types';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [log, setLog] = useState<EmailLog | null>(null);
  const [events, setEvents] = useState<EmailEventLog[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logId = params.id as string;

  useEffect(() => {
    if (!authLoading && user && logId) {
      loadDetail();
    }
  }, [authLoading, user, logId]);

  const loadDetail = async () => {
    if (!user) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
      const result = await emailService.getEmailLogDetail(user.tenantId, logId);
      
      if (!result) {
        setError('No se encontró el correo solicitado.');
        return;
      }

      setLog(result.log);
      setEvents(result.events);
    } catch (err) {
      setError('Error al cargar los detalles del correo.');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sent': return '📤';
      case 'delivered': return '✅';
      case 'opened': return '👁️';
      case 'clicked': return '🖱️';
      case 'bounced': return '⚠️';
      case 'complained': return '🚫';
      default: return '📧';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'sent': return 'border-blue-200 bg-blue-50';
      case 'delivered': return 'border-green-200 bg-green-50';
      case 'opened': return 'border-indigo-200 bg-indigo-50';
      case 'clicked': return 'border-purple-200 bg-purple-50';
      case 'bounced': return 'border-orange-200 bg-orange-50';
      case 'complained': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      OPENED: 'bg-indigo-100 text-indigo-800',
      CLICKED: 'bg-purple-100 text-purple-800',
      BOUNCED: 'bg-orange-100 text-orange-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (authLoading || isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Cargando detalles...</p>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            {error || 'No se encontró el correo.'}
          </div>
          <button
            onClick={() => router.push('/analytics')}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Volver a Analíticas
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <span>/</span>
            <Link href="/analytics" className="text-blue-600 hover:underline">Analíticas</Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Detalle</span>
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Detalle del Correo</h1>
            <button
              onClick={() => router.push('/analytics')}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Información del correo */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Información del Correo</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Destinatario</p>
              <p className="mt-1 text-base text-gray-900">{log.to}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <div className="mt-1">{getStatusBadge(log.status)}</div>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Asunto</p>
              <p className="mt-1 text-base text-gray-900">{log.subject}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha de envío</p>
              <p className="mt-1 text-base text-gray-900">
                {new Date(log.createdAt).toLocaleString('es-ES')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Abierto</p>
              <p className="mt-1 text-base text-gray-900">
                {log.openCount || 0} veces
                {log.openedAt && ` (última: ${new Date(log.openedAt).toLocaleString('es-ES')})`}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Clics</p>
              <p className="mt-1 text-base text-gray-900">
                {log.clickCount || 0} veces
                {log.clickedAt && ` (última: ${new Date(log.clickedAt).toLocaleString('es-ES')})`}
              </p>
            </div>
            {log.resendId && (
              <div>
                <p className="text-sm font-medium text-gray-500">Resend ID</p>
                <p className="mt-1 text-xs text-gray-700 font-mono">{log.resendId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline de eventos */}
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Timeline de Eventos</h2>
          
          {events.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No hay eventos registrados para este correo.
            </p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-lg border-l-4 p-4 ${getEventColor(event.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="text-xl">{getEventIcon(event.type)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900 capitalize">
                          {event.type === 'sent' ? 'Enviado' :
                           event.type === 'delivered' ? 'Entregado' :
                           event.type === 'opened' ? 'Abierto' :
                           event.type === 'clicked' ? 'Clickeado' :
                           event.type === 'bounced' ? 'Rebotado' :
                           event.type === 'complained' ? 'Reportado como spam' :
                           event.type}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                      
                      {event.metadata && (
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          {event.metadata.userAgent && (
                            <div>
                              <span className="font-medium">User Agent:</span> {event.metadata.userAgent}
                            </div>
                          )}
                          {event.metadata.ipAddress && (
                            <div>
                              <span className="font-medium">IP:</span> {event.metadata.ipAddress}
                            </div>
                          )}
                          {event.metadata.link && (
                            <div>
                              <span className="font-medium">Link clicado:</span>{' '}
                              <a 
                                href={event.metadata.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all"
                              >
                                {event.metadata.link}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}