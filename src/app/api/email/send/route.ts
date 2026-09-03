// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderTemplate } from '@/services/email.service';
import { emailServiceServer } from '@/services/email.service.server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // 1. Validar que la clave de Resend exista
    if (!process.env.RESEND_API_KEY) {
      console.error('ERROR: Falta RESEND_API_KEY en el entorno del servidor.');
      return NextResponse.json({ error: 'Configuración de servidor incompleta (Falta RESEND_API_KEY).' }, { status: 500 });
    }

    // 2. Inicializar Resend DENTRO de la petición
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 3. Validar autenticación del usuario
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado (Falta token).' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth } = getFirebaseAdmin();
    
    let tenantId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      tenantId = decodedToken.tenantId;
      if (!tenantId) throw new Error('Token sin tenantId');
    } catch (authError) {
      console.error('Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado. Cierra sesión y vuelve a entrar.' }, { status: 401 });
    }

    // 4. Obtener y validar datos
    const body = await request.json();
    const { templateId, to, subject, bodyText, variables } = body;

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    // 5. Renderizar plantilla
    const finalSubject = renderTemplate(subject, variables || {});
    const finalBody = renderTemplate(bodyText, variables || {});

    // 6. Registrar intento en Firestore USANDO ADMIN SDK (sin reglas de seguridad)
    await emailServiceServer.logEmail(tenantId, {
      templateId: templateId || undefined,
      to,
      subject: finalSubject,
      body: finalBody,
      status: 'PENDING',
    });

    // 7. Enviar con Resend
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `Appyempresa S.A.S <${fromEmail}>`,
      to: [to],
      subject: finalSubject,
      html: finalBody,
    });

    if (error) {
      console.error('Error específico de Resend:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Error de Resend: ${error.message || 'Error desconocido al enviar'}` 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Excepción no capturada en API email/send:', errorMessage);
    return NextResponse.json({ error: `Error interno: ${errorMessage}` }, { status: 500 });
  }
}