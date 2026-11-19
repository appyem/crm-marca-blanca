// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsapp.service';

interface WhatsAppSendRequest {
  to: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppSendRequest = await request.json();
    const { to, message } = body;

    if (!to || typeof to !== 'string' || to.trim().length === 0) {
      return NextResponse.json(
        { error: 'El campo "to" (número de destino) es obligatorio.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'El campo "message" (cuerpo del mensaje) es obligatorio.' },
        { status: 400 }
      );
    }

    const result = await whatsappService.sendTextMessage(to.trim(), message.trim());

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
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/send] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 500,
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}