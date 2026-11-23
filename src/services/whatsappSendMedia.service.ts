// src/services/whatsappSendMedia.service.ts

import { put } from '@vercel/blob';
import { whatsappConversationService } from '@/services/whatsappConversation.service';

const META_GRAPH_API_VERSION = 'v19.0';
const META_GRAPH_API_URL = 'https://graph.facebook.com';

export type SendableMediaType = 'image' | 'audio' | 'video' | 'document';

interface MediaUploadToMetaResult {
  id: string;
}

interface SendMediaParams {
  tenantId: string;
  to: string;
  phoneNumberId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  mediaType: SendableMediaType;
  caption?: string;
  conversationId: string;
}

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

/**
 * Limpia el MIME type para enviar a Meta.
 * Meta no acepta MIME types con parámetros como ";codecs=opus"
 * Ejemplo: "audio/ogg;codecs=opus" → "audio/ogg"
 */
function cleanMimeTypeForMeta(rawMimeType: string, mediaType: SendableMediaType): string {
  // Quitar parámetros después del punto y coma
  const baseMime = rawMimeType.split(';')[0].trim().toLowerCase();
  
  // Mapeo de MIME types compatibles con WhatsApp
  if (mediaType === 'audio') {
    // WhatsApp acepta: audio/aac, audio/mp4, audio/mpeg, audio/amr, audio/ogg, audio/opus
    if (baseMime === 'audio/ogg' || baseMime === 'audio/opus') {
      return 'audio/ogg';
    }
    if (baseMime === 'audio/mp4' || baseMime === 'audio/m4a') {
      return 'audio/mp4';
    }
    if (baseMime === 'audio/mpeg' || baseMime === 'audio/mp3') {
      return 'audio/mpeg';
    }
    if (baseMime === 'audio/aac') {
      return 'audio/aac';
    }
    if (baseMime === 'audio/amr') {
      return 'audio/amr';
    }
    // Fallback para formatos no estándar
    console.warn(`[whatsappSendMedia] MIME de audio no estándar: ${baseMime}. Usando audio/ogg como fallback.`);
    return 'audio/ogg';
  }
  
  if (mediaType === 'video') {
    if (baseMime === 'video/mp4') return 'video/mp4';
    if (baseMime === 'video/3gpp') return 'video/3gpp';
    return 'video/mp4';
  }
  
  if (mediaType === 'image') {
    if (baseMime === 'image/jpeg') return 'image/jpeg';
    if (baseMime === 'image/png') return 'image/png';
    if (baseMime === 'image/webp') return 'image/webp';
    return baseMime;
  }
  
  // Documento: usar MIME tal cual
  return baseMime;
}

/**
 * Asegura que la extensión del archivo coincida con el MIME type limpio
 */
function getFileNameWithCorrectExtension(fileName: string, cleanMime: string): string {
  const extMap: Record<string, string> = {
    'audio/ogg': '.ogg',
    'audio/opus': '.opus',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/aac': '.aac',
    'audio/amr': '.amr',
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  
  const newExt = extMap[cleanMime];
  if (!newExt) return fileName;
  
  // Quitar extensión existente
  const lastDot = fileName.lastIndexOf('.');
  const baseName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  return `${baseName}${newExt}`;
}

export const whatsappSendMediaService = {
  async sendMediaMessage(params: SendMediaParams): Promise<{ messageId: string; blobUrl: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) throw new Error('WHATSAPP_TOKEN no está configurado.');

    // Limpiar MIME type y corregir extensión del archivo
    const cleanMime = cleanMimeTypeForMeta(params.mimeType, params.mediaType);
    const correctedFileName = getFileNameWithCorrectExtension(params.fileName, cleanMime);

    console.log('[whatsappSendMedia] Iniciando envío:', {
      to: params.to,
      mediaType: params.mediaType,
      originalMimeType: params.mimeType,
      cleanMimeType: cleanMime,
      originalFileName: params.fileName,
      correctedFileName,
      fileSize: params.buffer.length,
      hasCaption: !!params.caption,
    });

    if (params.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`El archivo es muy grande (${(params.buffer.length / 1024 / 1024).toFixed(1)}MB). Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }

    // 1. Subir a Vercel Blob (historial permanente)
    const blobPathname = `whatsapp/${params.tenantId}/out_${Date.now()}_${correctedFileName}`;
    const blob = await put(blobPathname, params.buffer, {
      access: 'public',
      contentType: cleanMime,
    });

    console.log('[whatsappSendMedia] Archivo subido a Blob:', blob.url);

    // 2. Subir a Meta Cloud API para obtener media_id
    const metaFormData = new FormData();
    metaFormData.append('messaging_product', 'whatsapp');
    metaFormData.append('type', cleanMime);
    metaFormData.append(
      'file',
      new Blob([new Uint8Array(params.buffer)], { type: cleanMime }),
      correctedFileName
    );

    console.log('[whatsappSendMedia] Subiendo a Meta con MIME:', cleanMime);

    const uploadResponse = await fetch(
      `${META_GRAPH_API_URL}/${META_GRAPH_API_VERSION}/${params.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: metaFormData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[whatsappSendMedia] Error en upload a Meta:', errorText);
      throw new Error(`Meta rechazó el archivo (${uploadResponse.status}): ${errorText}`);
    }

    const uploadResult = (await uploadResponse.json()) as MediaUploadToMetaResult;
    console.log('[whatsappSendMedia] Meta upload response:', uploadResult);

    const metaMediaId = uploadResult.id;
    if (!metaMediaId) {
      throw new Error('Meta no devolvió media_id en la respuesta de upload');
    }

    // 3. Enviar mensaje con media_id al destinatario
    const sendBody: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: params.mediaType,
    };

    const mediaPayload: { id: string; caption?: string; filename?: string } = {
      id: metaMediaId,
    };

    if (params.mediaType !== 'audio' && params.caption && params.caption.trim().length > 0) {
      mediaPayload.caption = params.caption.trim();
    }

    if (params.mediaType === 'document') {
      mediaPayload.filename = correctedFileName;
    }

    sendBody[params.mediaType] = mediaPayload;

    console.log('[whatsappSendMedia] Enviando mensaje a Meta:', JSON.stringify(sendBody, null, 2));

    const sendResponse = await fetch(
      `${META_GRAPH_API_URL}/${META_GRAPH_API_VERSION}/${params.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendBody),
      }
    );

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('[whatsappSendMedia] Error en envío a Meta:', errorText);
      throw new Error(`Meta rechazó el envío (${sendResponse.status}): ${errorText}`);
    }

    const sendResult = (await sendResponse.json()) as { messages?: { id: string }[] };
    const messageId = sendResult.messages?.[0]?.id || `local_${Date.now()}`;

    console.log('[whatsappSendMedia] Mensaje enviado exitosamente:', messageId);

    // 4. Guardar en Firestore (OUTBOUND con media)
    const now = new Date().toISOString();
    const textForConversation = params.caption
      ? params.caption
      : `[${params.mediaType === 'image' ? 'Imagen' : params.mediaType === 'audio' ? 'Audio' : params.mediaType === 'video' ? 'Video' : 'Documento'} enviado]`;

    await whatsappConversationService.upsertConversation({
      tenantId: params.tenantId,
      phoneNumber: params.to,
      direction: 'OUTBOUND',
      messageText: textForConversation,
      messageTimestamp: now,
    });

    await whatsappConversationService.addMessage({
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      direction: 'OUTBOUND',
      messageType: params.mediaType,
      text: textForConversation,
      metaMessageId: messageId,
      status: 'sent',
      media: {
        type: params.mediaType,
        mediaFileId: blob.url,
        mimeType: cleanMime,
        sizeBytes: params.buffer.length,
        caption: params.mediaType !== 'audio' ? params.caption : undefined,
        fileName: correctedFileName,
        metaMediaId,
      },
      timestamp: now,
    });

    return { messageId, blobUrl: blob.url };
  },
};
