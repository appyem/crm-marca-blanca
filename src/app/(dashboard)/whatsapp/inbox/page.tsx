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
import {
  BlockReason,
  BLOCK_REASON_LABELS,
  BLOCK_REASONS,
} from '@/types/whatsappBlockedNumber.types';

type StatusFilter = 'ALL' | ConversationStatus;

const STATUS_CONFIG: Record<ConversationStatus, { label: string; color: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  EN_CURSO: { label: 'En curso', color: '#1d4ed8', bg: '#dbeafe' },
  ATENDIDA: { label: 'Atendida', color: '#15803d', bg: '#dcfce7' },
  CERRADA: { label: 'Cerrada', color: '#6b7280', bg: '#f3f4f6' },
};

const FREE_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_SIZE = 16 * 1024 * 1024;

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
    case 'sent': return { symbol: '✓', color: '#8696a0' };
    case 'delivered': return { symbol: '✓✓', color: '#8696a0' };
    case 'read': return { symbol: '✓✓', color: '#53bdeb' };
    case 'failed': return { symbol: '⚠️', color: '#ef4444' };
    default: return { symbol: '✓', color: '#8696a0' };
  }
}

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => audioRef.current && (isPlaying ? audioRef.current.pause() : audioRef.current.play())}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          backgroundColor: '#25D366', color: 'white', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', flexShrink: 0,
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: '120px' }}>
        <div style={{ height: '4px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%', backgroundColor: '#25D366', transition: 'width 0.1s linear' }} />
        </div>
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </p>
      </div>
    </div>
  );
}

function ImageViewer({ url, caption }: { url: string; caption?: string }) {
  const [isZoomed, setIsZoomed] = useState(false);
  return (
    <>
      <div onClick={() => setIsZoomed(true)} style={{ cursor: 'zoom-in' }}>
        <img src={url} alt={caption || 'Imagen'} style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '6px', display: 'block' }} />
        {caption && <p style={{ fontSize: '12px', color: '#303030', margin: '6px 0 0' }}>{caption}</p>}
      </div>
      {isZoomed && (
        <div onClick={() => setIsZoomed(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '20px' }}>
          <img src={url} alt={caption || ''} style={{ maxWidth: '95%', maxHeight: '95%' }} />
        </div>
      )}
    </>
  );
}

function VideoPlayer({ url, caption }: { url: string; caption?: string }) {
  return (
    <div>
      <video src={url} controls style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '6px', display: 'block' }} />
      {caption && <p style={{ fontSize: '12px', color: '#303030', margin: '6px 0 0' }}>{caption}</p>}
    </div>
  );
}

function DocumentView({ url, fileName }: { url: string; fileName?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '6px', textDecoration: 'none', color: '#111827', minWidth: '200px' }}>
      <span style={{ fontSize: '28px' }}>📄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Documento'}</p>
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>Clic para descargar</p>
      </div>
    </a>
  );
}

function MessageContent({ message }: { message: WhatsAppMessage }) {
  const media = message.media;
  if (!media) {
    return <p style={{ fontSize: '14px', color: '#303030', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{message.text}</p>;
  }
  const mediaUrl = media.mediaFileId;
  if (!mediaUrl) {
    return <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>[Archivo multimedia no disponible]</p>;
  }
  switch (media.type) {
    case 'audio': return <AudioPlayer url={mediaUrl} />;
    case 'image': return <ImageViewer url={mediaUrl} caption={media.caption} />;
    case 'video': return <VideoPlayer url={mediaUrl} caption={media.caption} />;
    case 'document': return <DocumentView url={mediaUrl} fileName={media.fileName} />;
    default: return <p style={{ fontSize: '14px', color: '#303030', margin: 0 }}>{message.text || '[Archivo multimedia]'}</p>;
  }
}

function AudioRecorder({ onRecorded, onCancel }: { onRecorded: (blob: Blob) => void; onCancel: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Usar MediaRecorder nativo con Opus (formato que WhatsApp acepta)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('[AudioRecorder] Audio generado:', blob.type, 'size:', blob.size);
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        onRecorded(blob);
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('[AudioRecorder] Error:', err);
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    setIsRecording(false);
    setDuration(0);
    onCancel();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    return (
      <button
        onClick={startRecording}
        style={{ padding: '10px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        🎙️ Grabar audio
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', flex: 1 }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s ease-in-out infinite' }} />
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>Grabando {formatDuration(duration)}</span>
      <button onClick={stopRecording} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
        ⏹ Detener y enviar
      </button>
      <button onClick={cancelRecording} style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
        Cancelar
      </button>
    </div>
  );
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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReplyFree, setCanReplyFree] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState<BlockReason>('spam');
  const [blockReasonDetails, setBlockReasonDetails] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (response.ok && result.success) setConversations(result.conversations);
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
      if (response.ok && result.success && selectedIdRef.current === conversationId) {
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
    } catch (err) {
      console.error('[Inbox] Error cargando mensajes:', err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) loadConversations(false);
  }, [authLoading, user, loadConversations]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadConversations(true), 20000);
    return () => clearInterval(interval);
  }, [user, loadConversations]);

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
    setPendingFile(null);
    setShowCaptionInput(false);
    await checkIfBlocked(conversation.phoneNumber);
    await loadMessages(conversation.id, false);

    if (conversation.unreadCount > 0) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch(`/api/whatsapp/conversations/${conversation.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'mark_read' }),
          });
          setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c));
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
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Error al enviar');
      setReplyText('');
      await loadMessages(selectedConversation.id, false);
      await loadConversations(true);
    } catch (err: unknown) {
      setError(`Error al responder: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendMedia = async (fileToSend: File, caption?: string) => {
    if (!selectedConversation || !canReplyFree) return;

    console.log('[Inbox] Sending media file:', {
      name: fileToSend.name,
      type: fileToSend.type,
      size: fileToSend.size,
    });

    if (fileToSend.size > MAX_FILE_SIZE) {
      setError(`El archivo es muy grande (${(fileToSend.size / 1024 / 1024).toFixed(1)}MB). Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    setIsUploadingMedia(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');

      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('to', selectedConversation.phoneNumber);
      formData.append('conversationId', selectedConversation.id);
      if (caption && caption.trim().length > 0) {
        formData.append('caption', caption.trim());
      }

      const response = await fetch('/api/whatsapp/media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      
      console.log('[Inbox] Media send response:', result);
      
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || result.error || 'Error al enviar archivo');
      }

      setPendingFile(null);
      setPendingCaption('');
      setShowCaptionInput(false);
      await loadMessages(selectedConversation.id, false);
      await loadConversations(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[Inbox] Error sending media:', err);
      setError(`Error al enviar archivo: ${errorMessage}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowCaptionInput(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRecordedAudio = async (blob: Blob) => {
    const fileName = `audio_${Date.now()}.mp3`;
    const file = new File([blob], fileName, { type: 'audio/mpeg' });
    await handleSendMedia(file, 'Nota de voz');
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
        setSelectedConversation(prev => prev ? { ...prev, status } : prev);
        setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, status } : c));
      }
    } catch (err) {
      console.error('[Inbox] Error cambiando estado:', err);
    }
  };

  const checkIfBlocked = useCallback(async (phoneNumber: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch('/api/whatsapp/blocked', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        const normalized = phoneNumber.replace(/\D/g, '');
        const isItBlocked = result.blockedNumbers?.some(
          (b: { phoneNumber: string }) => b.phoneNumber === normalized
        );
        setIsBlocked(!!isItBlocked);
      }
    } catch (err) {
      console.error('[Inbox] Error verificando bloqueo:', err);
    }
  }, []);

  const handleBlockNumber = async () => {
    if (!selectedConversation) return;
    if (blockReason === 'otro' && !blockReasonDetails.trim()) {
      setError('Si la razón es "Otro", debes especificar los detalles.');
      return;
    }
    setIsBlocking(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');
      const response = await fetch('/api/whatsapp/blocked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: selectedConversation.phoneNumber,
          reason: blockReason,
          reasonDetails: blockReasonDetails.trim() || undefined,
          contactName: selectedConversation.contactName,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Error al bloquear');
      setIsBlocked(true);
      setShowBlockModal(false);
      setBlockReasonDetails('');
    } catch (err: unknown) {
      setError(`Error al bloquear: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockNumber = async () => {
    if (!selectedConversation) return;
    if (!confirm(`¿Desbloquear a ${selectedConversation.displayPhone}?`)) return;
    setIsBlocking(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sesión expirada.');
      const response = await fetch(
        `/api/whatsapp/blocked/${selectedConversation.phoneNumber}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Error al desbloquear');
      setIsBlocked(false);
    } catch (err: unknown) {
      setError(`Error al desbloquear: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsBlocking(false);
    }
  };

  const filteredConversations = conversations
    .filter(c => filter === 'ALL' || c.status === filter)
    .filter(c => search.trim() === '' || c.contactName.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search));

  const countByStatus = (status: ConversationStatus): number => conversations.filter(c => c.status === status).length;
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
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

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
              {totalUnread > 0 && <span style={{ marginLeft: '10px', backgroundColor: '#25D366', color: 'white', fontSize: '14px', fontWeight: '700', padding: '2px 10px', borderRadius: '12px' }}>{totalUnread}</span>}
            </h1>
          </div>
          <button onClick={() => loadConversations(false)} style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>🔄 Actualizar</button>
        </div>

        {error && <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', border: '1px solid #fecaca', borderRadius: '6px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['ALL', 'PENDIENTE', 'EN_CURSO', 'ATENDIDA', 'CERRADA'] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: '1px solid', backgroundColor: filter === f ? '#111827' : 'white', color: filter === f ? 'white' : '#374151', borderColor: filter === f ? '#111827' : '#d1d5db' }}>
              {f === 'ALL' ? `Todas (${conversations.length})` : `${STATUS_CONFIG[f as ConversationStatus].label} (${countByStatus(f as ConversationStatus)})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', height: 'calc(100vh - 220px)', minHeight: '600px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar por nombre o número..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', color: '#111827' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {isLoadingConversations && conversations.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Cargando conversaciones...</div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No hay conversaciones en este filtro.</div>
              ) : (
                filteredConversations.map(conv => (
                  <div key={conv.id} onClick={() => handleSelectConversation(conv)} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', backgroundColor: selectedConversation?.id === conv.id ? '#f0fdf4' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{conv.contactName}</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatRelativeTime(conv.lastMessageAt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{conv.displayPhone}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', color: STATUS_CONFIG[conv.status].color, backgroundColor: STATUS_CONFIG[conv.status].bg }}>{STATUS_CONFIG[conv.status].label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                        {conv.lastMessageDirection === 'INBOUND' ? '↩️' : '↪️'} {conv.lastMessageText}
                      </span>
                      {conv.unreadCount > 0 && <span style={{ backgroundColor: '#25D366', color: 'white', fontSize: '11px', fontWeight: '700', padding: '1px 7px', borderRadius: '10px', marginLeft: '8px' }}>{conv.unreadCount}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {!selectedConversation ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9ca3af' }}>
                <span style={{ fontSize: '48px', marginBottom: '12px' }}>💬</span>
                <p style={{ fontSize: '15px', fontWeight: '500' }}>Selecciona una conversación para ver el chat</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>{selectedConversation.contactName}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{selectedConversation.displayPhone}{selectedConversation.contactId && ' · 📇 Contacto CRM vinculado'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {selectedConversation.status !== 'ATENDIDA' && <button onClick={() => handleChangeStatus('ATENDIDA')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer' }}>✓ Marcar atendida</button>}
                    {selectedConversation.status !== 'CERRADA' ? (
                      <button onClick={() => handleChangeStatus('CERRADA')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cerrar</button>
                    ) : (
                      <button onClick={() => handleChangeStatus('EN_CURSO')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: '6px', cursor: 'pointer' }}>Reabrir</button>
                    )}
                    {isBlocked ? (
                      <button
                        onClick={handleUnblockNumber}
                        disabled={isBlocking}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '6px', cursor: isBlocking ? 'not-allowed' : 'pointer' }}
                      >
                        ⛔ Desbloquear
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlockModal(true)}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        🚫 Bloquear
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#ece5dd', backgroundImage: 'radial-gradient(#d6cec4 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                  {isLoadingMessages && messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Cargando mensajes...</p>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                        <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: '8px', backgroundColor: msg.direction === 'OUTBOUND' ? '#dcf8c6' : 'white', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                          <MessageContent message={msg} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#8696a0' }}>{formatClockTime(msg.timestamp)}</span>
                            {msg.direction === 'OUTBOUND' && <span style={{ fontSize: '10px', color: getStatusTicks(msg).color }}>{getStatusTicks(msg).symbol}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  {canReplyFree ? (
                    <>
                      {pendingFile && (
                        <div style={{ marginBottom: '10px', padding: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>📎 Archivo seleccionado: {pendingFile.name} ({(pendingFile.size / 1024 / 1024).toFixed(2)}MB)</span>
                            <button onClick={() => { setPendingFile(null); setPendingCaption(''); setShowCaptionInput(false); }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Quitar</button>
                          </div>
                          {showCaptionInput && (
                            <input type="text" value={pendingCaption} onChange={e => setPendingCaption(e.target.value)} placeholder="Caption opcional (texto que acompaña al archivo)" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', color: '#111827' }} />
                          )}
                          <button onClick={() => handleSendMedia(pendingFile, pendingCaption)} disabled={isUploadingMedia} style={{ marginTop: '8px', padding: '8px 16px', backgroundColor: isUploadingMedia ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: isUploadingMedia ? 'not-allowed' : 'pointer' }}>
                            {isUploadingMedia ? 'Enviando...' : `Enviar ${pendingFile.name}`}
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileSelected} style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingMedia || isSendingReply} style={{ padding: '10px 14px', backgroundColor: 'white', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📎 Archivo
                        </button>

                        <AudioRecorder onRecorded={handleRecordedAudio} onCancel={() => {}} />

                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} placeholder="Escribe un mensaje de texto..." style={{ flex: 1, minWidth: '200px', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#111827' }} />

                        <button onClick={handleSendReply} disabled={isSendingReply || replyText.trim().length === 0} style={{ padding: '10px 20px', backgroundColor: isSendingReply || replyText.trim().length === 0 ? '#9ca3af' : '#25D366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: isSendingReply || replyText.trim().length === 0 ? 'not-allowed' : 'pointer' }}>
                          {isSendingReply ? 'Enviando...' : 'Enviar ➤'}
                        </button>
                      </div>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '6px 0 0' }}>
                        ✅ Ventana de 24h activa. Puedes enviar texto, imágenes, audios (grabados o archivos), videos y documentos.
                      </p>
                    </>
                  ) : (
                    <div style={{ padding: '10px 14px', backgroundColor: '#fef3c7', border: '1px solid #fde047', borderRadius: '6px' }}>
                      <p style={{ fontSize: '12px', color: '#854d0e', margin: 0 }}>
                        ⚠️ La ventana de respuesta libre (24h) está cerrada. Para contactar a este número usa una{' '}
                        <Link href="/contacts" style={{ color: '#2563eb', fontWeight: '600' }}>campaña con plantilla aprobada →</Link>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showBlockModal && selectedConversation && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>🚫 Bloquear número</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px' }}>
              Estás a punto de bloquear a <strong>{selectedConversation.contactName}</strong> ({selectedConversation.displayPhone}).
              <br />Esta persona podrá seguir enviándote mensajes, pero tú no los recibirás ni verás en tu bandeja de entrada.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Razón del bloqueo</label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value as BlockReason)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#111827' }}
              >
                {BLOCK_REASONS.map(r => (
                  <option key={r} value={r}>{BLOCK_REASON_LABELS[r]}</option>
                ))}
              </select>
            </div>
            {blockReason === 'otro' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Detalles (requerido)</label>
                <textarea
                  value={blockReasonDetails}
                  onChange={(e) => setBlockReasonDetails(e.target.value)}
                  placeholder="Especifica la razón..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#111827', resize: 'vertical' }}
                />
              </div>
            )}
            {error && (
              <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '13px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowBlockModal(false); setBlockReasonDetails(''); }}
                disabled={isBlocking}
                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleBlockNumber}
                disabled={isBlocking}
                style={{ padding: '8px 16px', backgroundColor: isBlocking ? '#9ca3af' : '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: isBlocking ? 'not-allowed' : 'pointer' }}
              >
                {isBlocking ? 'Bloqueando...' : 'Confirmar bloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
