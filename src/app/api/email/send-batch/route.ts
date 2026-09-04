// src/app/api/email/send-batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderTemplate } from '@/services/email.service';
import { emailServiceServer } from '@/services/email.service.server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

interface RecipientData {
  to: string;
  variables: Record<string, string>;
}

interface BatchPayload {
  templateId: string;
  subject: string;
  bodyText: string;
  recipients: RecipientData[];
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Configuración de servidor incompleta.' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1. Autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth, db } = getFirebaseAdmin();
    
    let tenantId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      tenantId = decodedToken.tenantId;
      if (!tenantId) throw new Error('Token sin tenantId');
    } catch (authError) {
      console.error('Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    // 2. Obtener datos
    const body: BatchPayload = await request.json();
    const { templateId, subject, bodyText, recipients } = body;

    // 3. VALIDACIÓN CRÍTICA DE LÍMITE (Máximo 100 por Resend)
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No hay destinatarios.' }, { status: 400 });
    }
    if (recipients.length > 100) {
      return NextResponse.json({ 
        error: 'Límite excedido: Tu plan actual permite un máximo de 100 correos por envío.' 
      }, { status: 400 });
    }

    if (!subject || !bodyText) {
      return NextResponse.json({ error: 'Faltan datos de la plantilla.' }, { status: 400 });
    }

    // 4. Obtener nombre del tenant para el remitente
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    const senderName = tenantData?.name || tenantData?.companyName || 'CRM App';
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const finalFrom = `${senderName} <${fromEmail}>`;

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // 5. Procesar en lote
    for (const recipient of recipients) {
      try {
        const finalSubject = renderTemplate(subject, recipient.variables || {});
        const finalBody = renderTemplate(bodyText, recipient.variables || {});

        // Registrar en Firestore
        await emailServiceServer.logEmail(tenantId, {
          templateId,
          to: recipient.to,
          subject: finalSubject,
          body: finalBody,
          status: 'PENDING',
        });

        // Enviar con Resend
        const { error } = await resend.emails.send({
          from: finalFrom,
          to: [recipient.to],
          subject: finalSubject,
          html: finalBody,
        });

        if (error) {
          results.failed++;
          results.errors.push(`Error al enviar a ${recipient.to}: ${error.message}`);
        } else {
          results.success++;
        }
      } catch (err) {
        results.failed++;
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        results.errors.push(`Fallo crítico para ${recipient.to}: ${msg}`);
      }
    }

    return NextResponse.json({ success: true, summary: results });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Excepción en API email/send-batch:', errorMessage);
    return NextResponse.json({ error: `Error interno: ${errorMessage}` }, { status: 500 });
  }
}