// src/services/whatsappMedia.service.ts

import { put } from '@vercel/blob';

const META_GRAPH_API_VERSION = 'v19.0';
const META_GRAPH_API_URL = 'https://graph.facebook.com';

export interface TransferredMedia {
  url: string;
  contentType: string;
  sizeBytes: number;
}

interface MetaMediaMetadata {
  id: string;
  url: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
}

export const whatsappMediaService = {
  /**
   * Sube un buffer a Vercel Blob con acceso público.
   */
  async uploadBufferToBlob(
    buffer: Buffer,
    pathname: string,
    contentType: string
  ): Promise<TransferredMedia> {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
    });
    return {
      url: blob.url,
      contentType,
      sizeBytes: buffer.length,
    };
  },

  /**
   * Descarga un archivo multimedia desde Meta (URL temporal de 24h).
   */
  async downloadMetaMedia(
    metaMediaId: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) throw new Error('WHATSAPP_TOKEN no está configurado.');

    // 1. Obtener la URL temporal del media
    const metaResponse = await fetch(
      `${META_GRAPH_API_URL}/${META_GRAPH_API_VERSION}/${metaMediaId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!metaResponse.ok) {
      throw new Error(`Error obteniendo metadata de Meta: ${metaResponse.status}`);
    }

    const metaData: MetaMediaMetadata = await metaResponse.json();
    if (!metaData.url) {
      throw new Error('Meta no devolvió URL del media.');
    }
    const contentType = metaData.mime_type || 'application/octet-stream';

    // 2. Descargar el binario usando la URL temporal
    const binaryResponse = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!binaryResponse.ok) {
      throw new Error(`Error descargando binario de Meta: ${binaryResponse.status}`);
    }

    const arrayBuffer = await binaryResponse.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), contentType };
  },

  /**
   * Descarga de Meta y sube a Vercel Blob (URL permanente).
   */
  async transferMetaMediaToBlob(
    metaMediaId: string,
    pathname: string
  ): Promise<TransferredMedia> {
    const { buffer, contentType } = await this.downloadMetaMedia(metaMediaId);
    return this.uploadBufferToBlob(buffer, pathname, contentType);
  },
};
