// src/app/(dashboard)/whatsapp/inbox/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  ConversationStatus,
} from '@/types/whatsappConversation.types';

type StatusFilter = 'ALL' | ConversationStatus;

const STATUS_CONFIG: Record<ConversationStatus, { label: string; color: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  EN_CURSO: { label: 'En curso', color: '#1d4ed8', bg: '#dbeafe' },
  ATENDIDA: { label: 'Atendida', color: '#15803d', bg: '#dcfce7' },
  CERRADA: { label: 'Cerrada', color: '#6b7280', bg: '#f3f4f6' },
};

const FREE_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

function formatClockTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function getStatusTicks(message: WhatsAppMessage): { symbol: string; color: string } {
  switch (message.status) {
    case 'sent':
      return { symbol: '✓', color: '#8696a0' };
    case 'delivered':
      return { symbol: '✓✓', color: '#8696a0' };
    case 'read':
      return { symbol: '✓✓', color: '#53bdeb' };
    case 'failed':
      return { symbol: '⚠️', color: '#ef4444' };
    default:
      return { symbol: '✓', color: '#8696a0' };
  }
}

export default function WhatsAppInboxPage() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReplyFree, setCanReplyFree] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (silent: boolean) => {
    if (!user) return;
    if (!silent) setIsLoadingConversations(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/whatsapp/conversations', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setConversations(result.conversations);
      }
    } catch (err) {
      console.error('[Inbox] Error cargando conversaciones:', err);
    } finally {
      if (!silent) setIsLoadingConversations(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string, silent: boolean) => {
    if (!user) return;
    if (!silent) setIsLoadingMessages(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        if (selectedIdRef.current === conversationId) {
          setMessages(result.messages);
          const lastInbound = [...result.messages].reverse().find(
            (m: WhatsAppMessage) => m.direction === 'INBOUND'
          );
          setCanReplyFree(
            lastInbound
              ? Date.now() - new Date(lastInbound.timestamp).getTime() < FREE_REPLY_WINDOW_MS
              : false
          );
        }
      }
    } catch (err) {
      console.error('[Inbox] Error cargando mensajes:', err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadConversations(false);
    }
  }, [authLoading, user, loadConversations]);

  // Auto-refresh de conversaciones cada 20 segundos
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadConversations(true), 20000);
    return () => clearInterval(interval);
  }, [user, loadConversations]);

  // Auto-refresh de mensajes cada 10 segundos con conversación abierta
  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => loadMessages(selectedConversation.id, true), 10000);
    return () => clearInterval(interval);
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    selectedIdRef.current = conversation.id;
    setMessages([]);
    setReplyText('');
    await loadMessages(conversation.id, false);

    // Marcar como leída
    if (conversation.unreadCount > 0) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch(`/api/whatsapp/conversations/${conversation.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'mark_read' }),
          });
          setConversations(prev =>
            prev.map(c => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('[Inbox] Error marcando como leída:', err);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim() || !canReplyFree) return;
    setIsSendingReply(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          mode: 'text',
          to: selectedConversation.phoneNumber,
          message: replyText.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Error al enviar');
      }
      setReplyText('');
      await loadMessages(selectedConversation.id, false);
      await loadConversations(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al responder: ${message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleChangeStatus = async (status: ConversationStatus) => {
    if (!selectedConversation) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'set_status', status }),
      });
      if (response.ok) {
        setSelectedConversation(prev => (prev ? { ...prev, status } : prev));
        setConversations(prev => prev.map(c => (c.id === selectedConversation.id ? { ...c, status } : c)));
      }
    } catch (err) {
      console.error('[Inbox] Error cambiando estado:', err);
    }
  };

  const filteredConversations = conversations
    .filter(c => (filter === 'ALL' ? true : c.status === filter))
    .filter(c =>
      search.trim() === ''
        ? true
        : c.contactName.toLowerCase().includes(search.toLowerCase()) ||
          c.phoneNumber.includes(search)
    );

  const countByStatus = (status: ConversationStatus): number =>
    conversations.filter(c => c.status === status).length;

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <nav style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
              <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
              <span>/</span>
              <span style={{ fontWeight: '500', color: '#111827' }}>WhatsApp</span>
              <span>/</span>
              <span style={{ fontWeight: '500', color: '#111827' }}>Bandeja de entrada</span>
            </nav>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              📥 Bandeja de Entrada WhatsApp
              {totalUnread > 0 && (
                <span style={{ marginLeft: '10px', backgroundColor: '#25D366', color: 'white', fontSize: '14px', fontWeight: '700', padding: '2px 10px', borderRadius: '12px' }}>
                  {totalUnread}
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => loadConversations(false)}
            style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}
          >
            🔄 Actualizar
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        {/* FILTROS POR ESTADO */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['ALL', 'PENDIENTE', 'EN_CURSO', 'ATENDIDA', 'CERRADA'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: '1px solid',
                backgroundColor: filter === f ? '#111827' : 'white',
                color: filter === f ? 'white' : '#374151',
                borderColor: filter === f ? '#111827' : '#d1d5db',
              }}
            >
              {f === 'ALL' ? `Todas (${conversations.length})` : `${STATUS_CONFIG[f as ConversationStatus].label} (${countByStatus(f as ConversationStatus)})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', minHeight: '70vh' }}>

          {/* LISTA DE CONVERSACIONES */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Buscar por nombre o número..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', color: '#111827' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {isLoadingConversations && conversations.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Cargando conversaciones...</div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                  No hay conversaciones en este filtro.
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      backgroundColor: selectedConversation?.id === conv.id ? '#f0fdf4' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {conv.contactName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{conv.displayPhone}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', color: STATUS_CONFIG[conv.status].color, backgroundColor: STATUS_CONFIG[conv.status].bg }}>
                        {STATUS_CONFIG[conv.status].label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                        {conv.lastMessageDirection === 'INBOUND' ? '↩️' : '↪️'} {conv.lastMessageText}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span style={{ backgroundColor: '#25D366', color: 'white', fontSize: '11px', fontWeight: '700', padding: '1px 7px', borderRadius: '10px', marginLeft: '8px' }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* VISTA DE CHAT */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!selectedConversation ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9ca3af' }}>
                <span style={{ fontSize: '48px', marginBottom: '12px' }}>💬</span>
                <p style={{ fontSize: '15px', fontWeight: '500' }}>Selecciona una conversación para ver el chat</p>
              </div>
            ) : (
              <>
                {/* HEADER DEL CHAT */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>
                      {selectedConversation.contactName}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {selectedConversation.displayPhone}
                      {selectedConversation.contactId && ' · 📇 Contacto CRM vinculado'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {selectedConversation.status !== 'ATENDIDA' && (
                      <button onClick={() => handleChangeStatus('ATENDIDA')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer' }}>
                        ✓ Marcar atendida
                      </button>
                    )}
                    {selectedConversation.status !== 'CERRADA' ? (
                      <button onClick={() => handleChangeStatus('CERRADA')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
                        Cerrar
                      </button>
                    ) : (
                      <button onClick={() => handleChangeStatus('EN_CURSO')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: '6px', cursor: 'pointer' }}>
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>

                {/* MENSAJES */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#ece5dd', backgroundImage: 'radial-gradient(#d6cec4 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                  {isLoadingMessages && messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Cargando mensajes...</p>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start',
                          marginBottom: '10px',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '65%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: msg.direction === 'OUTBOUND' ? '#dcf8c6' : 'white',
                            boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                          }}
                        >
                          <p style={{ fontSize: '14px', color: '#303030', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                            {msg.text}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '10px', color: '#8696a0' }}>{formatClockTime(msg.timestamp)}</span>
                            {msg.direction === 'OUTBOUND' && (
                              <span style={{ fontSize: '10px', color: getStatusTicks(msg).color }}>
                                {getStatusTicks(msg).symbol}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* CAJA DE RESPUESTA */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  {canReplyFree ? (
                    <>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                          placeholder="Escribe tu respuesta..."
                          style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#111827' }}
                        />
                        <button
                          onClick={handleSendReply}
                          disabled={isSendingReply || replyText.trim().length === 0}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: isSendingReply || replyText.trim().length === 0 ? '#9ca3af' : '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isSendingReply || replyText.trim().length === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSendingReply ? 'Enviando...' : 'Enviar ➤'}
                        </button>
                      </div>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '6px 0 0' }}>
                        ✅ Ventana de 24h activa: puedes responder con texto libre sin costo de plantilla.
                      </p>
                    </>
                  ) : (
                    <div style={{ padding: '10px 14px', backgroundColor: '#fef3c7', border: '1px solid #fde047', borderRadius: '6px' }}>
                      <p style={{ fontSize: '12px', color: '#854d0e', margin: 0 }}>
                        ⚠️ La ventana de respuesta libre (24h) está cerrada. Para contactar a este número usa una{' '}
                        <Link href="/contacts" style={{ color: '#2563eb', fontWeight: '600' }}>
                          campaña con plantilla aprobada →
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
