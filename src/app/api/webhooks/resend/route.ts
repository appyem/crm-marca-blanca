// src/app/api/webhooks/resend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

interface ResendEventData {
  email_id?: string;
  from?: string;
  to?: string[];
  subject?: string;
  created_at?: string;
  click?: {
    link?: string;
    user_agent?: string;
    ip_address?: string;
  };
  open?: {
    user_agent?: string;
    ip_address?: string;
  };
  bounce?: {
    reason?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook] RESEND_WEBHOOK_SECRET no configurado');
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    // 1. Verificar firma
    let parsedEvent: unknown;
    try {
      const wh = new Webhook(webhookSecret);
      parsedEvent = wh.verify(payload, headers as Record<string, string>);
    } catch (err) {
      console.error('[Webhook] Firma inválida:', err);
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
    }

    // 2. Validar estructura (manejo defensivo)
    if (!parsedEvent || typeof parsedEvent !== 'object') {
      console.error('[Webhook] Evento vacío o malformado:', parsedEvent);
      return NextResponse.json({ error: 'Evento malformado' }, { status: 400 });
    }

    const event = parsedEvent as { type?: string; data?: ResendEventData };
    const type = event.type;
    const data = event.data;

    if (!type || !data) {
      console.error('[Webhook] Falta type o data en el evento:', event);
      return NextResponse.json({ error: 'Evento sin type o data' }, { status: 400 });
    }

    const resendEmailId = data.email_id;
    if (!resendEmailId) {
      console.log(`[Webhook] Evento ${type} sin email_id (puede ser un evento de dominio)`);
      return NextResponse.json({ success: true, ignored: true });
    }

    console.log(`[Webhook] Procesando: ${type} para ${resendEmailId}`);

    // 3. Buscar el emailLog por resendId en todos los tenants
    const { db } = getFirebaseAdmin();
    const allTenants = await db.collection('tenants').get();
    let targetLogRef: FirebaseFirestore.DocumentReference | null = null;
    let targetTenantId: string | null = null;

    for (const tenantDoc of allTenants.docs) {
      const logsSnapshot = await db
        .collection('tenants')
        .doc(tenantDoc.id)
        .collection('emailLogs')
        .where('resendId', '==', resendEmailId)
        .limit(1)
        .get();

      if (!logsSnapshot.empty) {
        targetLogRef = logsSnapshot.docs[0].ref;
        targetTenantId = tenantDoc.id;
        break;
      }
    }

    if (!targetLogRef || !targetTenantId) {
      console.log(`[Webhook] Email desconocido: ${resendEmailId}`);
      return NextResponse.json({ success: true, ignored: true });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };

    // 4. Actualizar según el tipo de evento
    switch (type) {
      case 'email.sent':
        updates.status = 'SENT';
        break;

      case 'email.delivered':
        updates.status = 'DELIVERED';
        updates.deliveredAt = now;
        break;

      case 'email.opened': {
        updates.status = 'OPENED';
        updates.openedAt = now;
        const currentData = (await targetLogRef.get()).data();
        updates.openCount = Number(currentData?.openCount || 0) + 1;
        
        await db.collection('tenants').doc(targetTenantId).collection('emailEvents').add({
          emailLogId: targetLogRef.id,
          tenantId: targetTenantId,
          type: 'opened',
          timestamp: now,
          metadata: {
            userAgent: data.open?.user_agent,
            ipAddress: data.open?.ip_address,
          },
        });
        break;
      }

      case 'email.clicked': {
        updates.status = 'CLICKED';
        updates.clickedAt = now;
        const currentData = (await targetLogRef.get()).data();
        updates.clickCount = Number(currentData?.clickCount || 0) + 1;
        
        await db.collection('tenants').doc(targetTenantId).collection('emailEvents').add({
          emailLogId: targetLogRef.id,
          tenantId: targetTenantId,
          type: 'clicked',
          timestamp: now,
          metadata: {
            link: data.click?.link,
            userAgent: data.click?.user_agent,
            ipAddress: data.click?.ip_address,
          },
        });
        break;
      }

      case 'email.bounced':
        updates.status = 'BOUNCED';
        updates.bouncedAt = now;
        
        await db.collection('tenants').doc(targetTenantId).collection('emailEvents').add({
          emailLogId: targetLogRef.id,
          tenantId: targetTenantId,
          type: 'bounced',
          timestamp: now,
          metadata: {
            reason: data.bounce?.reason,
          },
        });
        break;

      case 'email.complained':
        updates.status = 'FAILED';
        
        await db.collection('tenants').doc(targetTenantId).collection('emailEvents').add({
          emailLogId: targetLogRef.id,
          tenantId: targetTenantId,
          type: 'complained',
          timestamp: now,
        });
        break;

      default:
        console.log(`[Webhook] Evento no manejado: ${type}`);
    }

    // 5. Aplicar actualización
    if (Object.keys(updates).length > 1) {
      await targetLogRef.update(updates);
    }

    return NextResponse.json({ success: true, processed: type });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[Webhook] Error general:', errorMessage);
    // Devolver 200 para que Resend no reintente infinitamente
    return NextResponse.json({ error: errorMessage }, { status: 200 });
  }
}