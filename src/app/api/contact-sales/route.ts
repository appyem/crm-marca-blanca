// src/app/api/contact-sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await request.json();
    const { name, email, company, phone, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y correo son obligatorios' }, { status: 400 });
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superAdminEmail) {
      return NextResponse.json({ error: 'No hay email de administrador configurado' }, { status: 500 });
    }

    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    const htmlContent = `
      <h2>Nueva solicitud de Demo / Contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Empresa:</strong> ${company || 'No especificada'}</p>
      <p><strong>Teléfono:</strong> ${phone || 'No especificado'}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${message || 'Sin mensaje adicional'}</p>
      <hr />
      <p><em>Recibido desde el formulario público de contacto.</em></p>
    `;

    const { error } = await resend.emails.send({
      from: `CRM SaaS <${fromEmail}>`,
      to: [superAdminEmail],
      subject: `📩 Nueva solicitud de demo: ${name} - ${company || 'Sin empresa'}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Error enviando email de contacto:', error);
      return NextResponse.json({ error: 'No se pudo enviar el mensaje' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Mensaje enviado correctamente' });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error en contact-sales:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}