// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappService } from '@/services/whatsapp.service';
import { whatsappConversationService } from '@/services/whatsappConversation.service';

interface WhatsAppSendTextRequest {
  mode: 'text';
  to: string;
  message: string;
}

interface WhatsAppSendTemplateRequest {
  mode: 'template';
  to: string;
  templateName: string;
  variables: string[];
}

type WhatsAppSendRequest = WhatsAppSendTextRequest | WhatsAppSendTemplateRequest;

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación (mismo patrón que email/send-batch)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth } = getFirebaseAdmin();

    let tenantId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      tenantId = decodedToken.tenantId;
      if (!tenantId) throw new Error('Token sin tenantId');
    } catch (authError) {
      console.error('[/api/whatsapp/send] Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    // 2. Parsear y validar body
    const body: WhatsAppSendRequest = await request.json();

    if (!body.mode || !['text', 'template'].includes(body.mode)) {
      return NextResponse.json(
        { error: 'El campo "mode" debe ser "text" o "template".' },
        { status: 400 }
      );
    }

    if (!body.to || typeof body.to !== 'string' || body.to.trim().length === 0) {
      return NextResponse.json(
        { error: 'El campo "to" (número de destino) es obligatorio.' },
        { status: 400 }
      );
    }

    // 3. Enviar según modo
    let result;
    let messageText: string;

    if (body.mode === 'text') {
      if (!body.message || typeof body.message !== 'string') {
        return NextResponse.json(
          { error: 'El campo "message" es obligatorio en modo text.' },
          { status: 400 }
        );
      }
      messageText = body.message.trim();
      result = await whatsappService.sendTextMessage(body.to.trim(), messageText);
    } else {
      if (!body.templateName || typeof body.templateName !== 'string') {
        return NextResponse.json(
          { error: 'El campo "templateName" es obligatorio en modo template.' },
          { status: 400 }
        );
      }
      const variables = Array.isArray(body.variables) ? body.variables : [];
      messageText = `[Plantilla: ${body.templateName.trim()}] ${variables.join(' | ')}`;
      result = await whatsappService.sendTemplateMessage(
        body.to.trim(),
        body.templateName.trim(),
        variables
      );
    }

    // 4. Registrar en conversación si el envío fue exitoso
    if (result.success) {
      try {
        const validation = whatsappService.validatePhone(body.to.trim());
        const normalizedPhone = validation.normalized || body.to.trim();
        const nowIso = new Date().toISOString();

        const conversationId = await whatsappConversationService.upsertConversation({
          tenantId,
          phoneNumber: normalizedPhone,
          direction: 'OUTBOUND',
          messageText,
          messageTimestamp: nowIso,
        });

        await whatsappConversationService.addMessage({
          tenantId,
          conversationId,
          direction: 'OUTBOUND',
          messageType: body.mode === 'template' ? 'template' : 'text',
          text: messageText,
          metaMessageId: result.messageId,
          status: 'sent',
          templateName: body.mode === 'template' ? body.templateName.trim() : undefined,
          timestamp: nowIso,
        });
      } catch (convError) {
        // No fallar el envío si el registro de conversación falla
        console.error('[/api/whatsapp/send] Error registrando conversación:', convError);
      }
    }

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          messageId: result.messageId,
          waId: result.waId,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/send] Error:', err);
    return NextResponse.json(
      { success: false, error: { code: 500, message: errorMessage } },
      { status: 500 }
    );
  }
}
