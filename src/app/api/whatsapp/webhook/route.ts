// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { whatsappWebhookService } from '@/services/whatsappWebhook.service';
import {
  WebhookPayload,
  WebhookVerifyParams,
} from '@/types/whatsappWebhook.types';

/**
 * GET: Meta verifica el webhook con este método.
 * Debe responder con el hub.challenge si el verify_token coincide.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const verifyToken = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    console.log('[/api/whatsapp/webhook] Verificación recibida:', {
      mode,
      verifyToken: verifyToken ? `${verifyToken.substring(0, 8)}...` : 'null',
      hasChallenge: !!challenge,
    });

    if (!expectedToken) {
      console.error('[/api/whatsapp/webhook] WHATSAPP_VERIFY_TOKEN no está configurado');
      return new NextResponse('Server misconfiguration', { status: 500 });
    }

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      if (!challenge) {
        return new NextResponse('Missing challenge', { status: 400 });
      }
      console.log('[/api/whatsapp/webhook] ✅ Verificación exitosa');
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.warn('[/api/whatsapp/webhook] ❌ Verificación fallida:', { mode, verifyToken });
    return new NextResponse('Forbidden', { status: 403 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/webhook] GET error:', errorMessage);
    return new NextResponse('Internal error', { status: 500 });
  }
}

/**
 * POST: Meta envía eventos (mensajes entrantes, status, errores).
 * IMPORTANTE: responder 200 lo más rápido posible para evitar retries.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parsear payload
    const payload: WebhookPayload = await request.json();
    
    // LOG DETALLADO DE TODOS LOS WEBHOOKS ENTRANTES
    console.log('[Webhook] ===== NUEVO WEBHOOK RECIBIDO =====');
    console.log('[Webhook] Timestamp:', new Date().toISOString());
    console.log('[Webhook] Payload completo:', JSON.stringify(payload, null, 2));

    // 2. Log básico (sin exponer datos sensibles)
    console.log('[/api/whatsapp/webhook] POST recibido:', {
      object: payload.object,
      entryCount: payload.entry?.length || 0,
    });

    // 3. Validar estructura básica
    if (!payload || payload.object !== 'whatsapp_business_account') {
      console.warn('[/api/whatsapp/webhook] Payload no reconocido');
      return NextResponse.json(
        { success: false, error: 'Payload no reconocido' },
        { status: 400 }
      );
    }

    // 4. Procesar eventos (puede tomar tiempo, pero respondemos 200 igual)
    const result = await whatsappWebhookService.processPayload(payload);

    const duration = Date.now() - startTime;
    console.log('[/api/whatsapp/webhook] Procesamiento completado:', {
      processed: result.processed,
      failed: result.failed,
      duration: `${duration}ms`,
      errors: result.errors.length,
    });

    // 5. Responder 200 SIEMPRE (Meta reenvía si no recibe 200)
    return NextResponse.json(
      {
        success: true,
        processed: result.processed,
        failed: result.failed,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/webhook] POST error:', errorMessage);
    
    // Incluso en error, responder 200 para evitar retries infinitos de Meta
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 200 }
    );
  }
}
