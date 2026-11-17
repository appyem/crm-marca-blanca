// src/app/api/webhooks/resend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    click?: {
      link: string;
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
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // 1. Validar firma del webhook
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET no está configurado');
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
    }

    const wh = new Webhook(webhookSecret);
    let event: ResendWebhookEvent;

    try {
      // ARREGLO: cast a unknown primero, luego al tipo específico
      event = wh.verify(payload, headers as Record<string, string>) as unknown as ResendWebhookEvent;
    } catch (err) {
      console.error('Firma de webhook inválida:', err);
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
    }

    // 2. Procesar el evento
    const { db } = getFirebaseAdmin();
    const { type, data } = event;
    const resendEmailId = data.email_id;

    if (!resendEmailId) {
      return NextResponse.json({ error: 'Falta email_id' }, { status: 400 });
    }

    // 3. Buscar el emailLog por resendId en todos los tenants
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
      console.log(`Webhook recibido para email desconocido: ${resendEmailId}`);
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
        console.log(`Evento no manejado: ${type}`);
    }

    // 5. Aplicar actualización
    if (Object.keys(updates).length > 1) {
      await targetLogRef.update(updates);
    }

    return NextResponse.json({ success: true, processed: type });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error procesando webhook de Resend:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 200 });
  }
}