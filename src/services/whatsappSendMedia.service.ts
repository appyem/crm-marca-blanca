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

export const whatsappSendMediaService = {
  async sendMediaMessage(params: SendMediaParams): Promise<{ messageId: string; blobUrl: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) throw new Error('WHATSAPP_TOKEN no está configurado.');

    if (params.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`El archivo es muy grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }

    const mediaType = params.mediaType;

    // 1. Subir a Vercel Blob (historial permanente)
    const blobPathname = `whatsapp/${params.tenantId}/out_${Date.now()}_${params.fileName}`;
    const blob = await put(blobPathname, params.buffer, {
      access: 'public',
      contentType: params.mimeType,
    });

    // 2. Subir a Meta Cloud API para obtener media_id
    const metaFormData = new FormData();
    metaFormData.append('messaging_product', 'whatsapp');
    metaFormData.append('type', params.mimeType);
    metaFormData.append(
      'file',
      new Blob([new Uint8Array(params.buffer)], { type: params.mimeType }),
      params.fileName
    );

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

    const mediaPayload: { id: string; caption?: string; filename?: string } = {
      id: metaMediaId,
    };
    if (params.caption && params.caption.trim().length > 0) {
      mediaPayload.caption = params.caption.trim();
    }
    if (mediaType === 'document') {
      mediaPayload.filename = params.fileName;
    }

    sendBody[mediaType] = mediaPayload;

    console.log('[whatsappSendMedia] Sending message with payload:', JSON.stringify(sendBody, null, 2));

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
      throw new Error(`Meta rechazó el envío (${sendResponse.status}): ${errorText}`);
    }

    const sendResult = (await sendResponse.json()) as { messages?: { id: string }[] };
    const messageId = sendResult.messages?.[0]?.id || `local_${Date.now()}`;

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
        caption: params.caption,
        fileName: params.fileName,
        metaMediaId,
      },
      timestamp: now,
    });

    return { messageId, blobUrl: blob.url };
  },
};
