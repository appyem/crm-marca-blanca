// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsapp.service';

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
    const body: WhatsAppSendRequest = await request.json();

    // Validación de modo
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

    let result;

    if (body.mode === 'text') {
      if (!body.message || typeof body.message !== 'string') {
        return NextResponse.json(
          { error: 'El campo "message" es obligatorio en modo text.' },
          { status: 400 }
        );
      }
      result = await whatsappService.sendTextMessage(body.to.trim(), body.message.trim());
    } else {
      // Modo template
      if (!body.templateName || typeof body.templateName !== 'string') {
        return NextResponse.json(
          { error: 'El campo "templateName" es obligatorio en modo template.' },
          { status: 400 }
        );
      }
      const variables = Array.isArray(body.variables) ? body.variables : [];
      result = await whatsappService.sendTemplateMessage(
        body.to.trim(),
        body.templateName.trim(),
        variables
      );
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