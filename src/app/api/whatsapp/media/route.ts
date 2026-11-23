// src/app/api/whatsapp/media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappSendMediaService } from '@/services/whatsappSendMedia.service';

interface TenantDoc {
  whatsappPhoneNumberId?: string;
  [key: string]: unknown;
}

async function authenticate(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  const { auth: adminAuth } = getFirebaseAdmin();
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.tenantId || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await authenticate(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // 1. Parsear multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file');
    const to = formData.get('to');
    const caption = formData.get('caption');
    const conversationId = formData.get('conversationId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
    }
    if (typeof to !== 'string' || to.trim().length === 0) {
      return NextResponse.json({ error: 'Falta el número destino.' }, { status: 400 });
    }
    if (typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      return NextResponse.json({ error: 'Falta conversationId.' }, { status: 400 });
    }

    // 2. Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Obtener phone_number_id del tenant
    const { db } = getFirebaseAdmin();
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 404 });
    }
    const tenantData = tenantDoc.data() as TenantDoc;
    const phoneNumberId = tenantData.whatsappPhoneNumberId;
    if (!phoneNumberId) {
      return NextResponse.json({ error: 'Número de WhatsApp no configurado en el tenant.' }, { status: 400 });
    }

    // 4. Enviar
    const result = await whatsappSendMediaService.sendMediaMessage({
      tenantId,
      to: to.trim(),
      phoneNumberId,
      buffer,
      mimeType: file.type || 'application/octet-stream',
      fileName: file.name,
      mediaType: file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : 'document',
      caption: typeof caption === 'string' ? caption : undefined,
      conversationId,
    });

    return NextResponse.json(
      { success: true, messageId: result.messageId, blobUrl: result.blobUrl },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/media] Error:', err);
    return NextResponse.json({ error: { message: errorMessage } }, { status: 500 });
  }
}
