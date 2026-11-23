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
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/3gpp'];
const SUPPORTED_AUDIO_TYPES = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg', 'audio/opus'];

export const whatsappSendMediaService = {
  async sendMediaMessage(params: SendMediaParams): Promise<{ messageId: string; blobUrl: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) throw new Error('WHATSAPP_TOKEN no está configurado.');

    console.log('[whatsappSendMedia] Iniciando envío:', {
      to: params.to,
      mediaType: params.mediaType,
      mimeType: params.mimeType,
      fileName: params.fileName,
      fileSize: params.buffer.length,
      hasCaption: !!params.caption,
    });

    if (params.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`El archivo es muy grande (${(params.buffer.length / 1024 / 1024).toFixed(1)}MB). Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }

    // Validar formatos soportados
    if (params.mediaType === 'video' && !SUPPORTED_VIDEO_TYPES.includes(params.mimeType)) {
      throw new Error(`Formato de video no soportado: ${params.mimeType}. WhatsApp solo acepta: ${SUPPORTED_VIDEO_TYPES.join(', ')}. Convierte tu video a MP4.`);
    }

    if (params.mediaType === 'audio' && !SUPPORTED_AUDIO_TYPES.includes(params.mimeType)) {
      console.warn(`[whatsappSendMedia] Formato de audio no estándar: ${params.mimeType}. Intentando enviar de todos modos.`);
    }

    const mediaType = params.mediaType;

    // 1. Subir a Vercel Blob (historial permanente)
    const blobPathname = `whatsapp/${params.tenantId}/out_${Date.now()}_${params.fileName}`;
    const blob = await put(blobPathname, params.buffer, {
      access: 'public',
      contentType: params.mimeType,
    });

    console.log('[whatsappSendMedia] Archivo subido a Blob:', blob.url);

    // 2. Subir a Meta Cloud API para obtener media_id
    const metaFormData = new FormData();
    metaFormData.append('messaging_product', 'whatsapp');
    metaFormData.append('type', params.mimeType);
    metaFormData.append(
      'file',
      new Blob([new Uint8Array(params.buffer)], { type: params.mimeType }),
      params.fileName
    );

    console.log('[whatsappSendMedia] Subiendo a Meta...');

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
      type: mediaType,
    };

    // IMPORTANTE: audio NO acepta caption, solo image/video/document
    const mediaPayload: { id: string; caption?: string; filename?: string } = {
      id: metaMediaId,
    };

    if (mediaType !== 'audio' && params.caption && params.caption.trim().length > 0) {
      mediaPayload.caption = params.caption.trim();
    }

    if (mediaType === 'document') {
      mediaPayload.filename = params.fileName;
    }

    sendBody[mediaType] = mediaPayload;

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
      : `[${mediaType === 'image' ? 'Imagen' : mediaType === 'audio' ? 'Audio' : mediaType === 'video' ? 'Video' : 'Documento'} enviado]`;

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
      messageType: mediaType,
      text: textForConversation,
      metaMessageId: messageId,
      status: 'sent',
      media: {
        type: mediaType,
        mediaFileId: blob.url,
        mimeType: params.mimeType,
        sizeBytes: params.buffer.length,
        caption: mediaType !== 'audio' ? params.caption : undefined,
        fileName: params.fileName,
        metaMediaId,
      },
      timestamp: now,
    });

    return { messageId, blobUrl: blob.url };
  },
};
