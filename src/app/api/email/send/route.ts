// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderTemplate } from '@/services/email.service';
import { emailService } from '@/services/email.service';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth } = getFirebaseAdmin();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const tenantId = decodedToken.tenantId;

    const body = await request.json();
    const { templateId, to, subject, bodyText, variables } = body;

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (to, subject, body)' }, { status: 400 });
    }

    const finalSubject = renderTemplate(subject, variables || {});
    const finalBody = renderTemplate(bodyText, variables || {});

    await emailService.logEmail(tenantId, {
      templateId: templateId || undefined,
      to,
      subject: finalSubject,
      body: finalBody,
      status: 'PENDING',
    });

    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `CRM <${fromEmail}>`,
      to: [to],
      subject: finalSubject,
      html: finalBody,
    });

    if (error) {
      console.error('Error de Resend:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error) {
    console.error('Error en API de envío de email:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}