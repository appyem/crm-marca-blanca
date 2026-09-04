// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderTemplate, emailService } from '@/services/email.service';
import { emailServiceServer } from '@/services/email.service.server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

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

    // 2. Obtener datos del cuerpo
    const body = await request.json();
    const { templateId, to, subject, bodyText, variables } = body;

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    // 3. Renderizar plantilla
    const finalSubject = renderTemplate(subject, variables || {});
    const finalBody = renderTemplate(bodyText, variables || {});

    // 4. Registrar en Firestore
    await emailServiceServer.logEmail(tenantId, {
      templateId: templateId || undefined,
      to,
      subject: finalSubject,
      body: finalBody,
      status: 'PENDING',
    });

    // 5. OBTENER EL NOMBRE DEL TENANT DINÁMICAMENTE
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    // Usamos 'name' o 'companyName' del tenant, con fallback a 'CRM App'
    const senderName = tenantData?.name || tenantData?.companyName || 'CRM App';
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const finalFrom = `${senderName} <${fromEmail}>`;

    // 6. Enviar con Resend usando el nombre dinámico
    const { data, error } = await resend.emails.send({
      from: finalFrom,
      to: [to],
      subject: finalSubject,
      html: finalBody,
    });

    if (error) {
      console.error('Error específico de Resend:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Excepción no capturada en API email/send:', errorMessage);
    return NextResponse.json({ error: `Error interno: ${errorMessage}` }, { status: 500 });
  }
}