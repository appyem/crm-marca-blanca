// src/app/data-deletion/page.tsx
// Página PÚBLICA: no requiere autenticación (requisito de Meta para publicar la app)

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instrucciones para la Eliminación de Datos | Appyempresa',
  description: 'Cómo solicitar la eliminación de tus datos personales tratados por Appyempresa S.A.S',
};

export default function DataDeletionPage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '48px 24px' }}>
      <article style={{ maxWidth: '800px', margin: '0 auto', color: '#111827', lineHeight: 1.7, fontSize: '15px' }}>

        <header style={{ marginBottom: '40px', borderBottom: '2px solid #111827', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Instrucciones para la Eliminación de Datos
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Última actualización: 22 de noviembre de 2026
          </p>
        </header>

        <Section title="1. Propósito de esta página">
          <p>
            Esta página explica, de forma clara y gratuita, cómo cualquier persona puede solicitar la{' '}
            <strong>eliminación definitiva de sus datos personales</strong> tratados por{' '}
            <strong>Appyempresa S.A.S</strong> a través de su plataforma CRM y de los servicios de
            mensajería integrados con WhatsApp Business API (Meta Platforms, Inc.), en cumplimiento de
            la Ley 1581 de 2012 de Colombia y de las políticas de datos de Meta.
          </p>
        </Section>

        <Section title="2. Quiénes pueden solicitar la eliminación">
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Titulares de datos:</strong> personas que recibieron comunicaciones (correo o WhatsApp) enviadas mediante la plataforma y cuyos datos fueron registrados por un cliente del servicio.</li>
            <li><strong>Usuarios de cuenta:</strong> personas que tuvieron credenciales de acceso a la plataforma y desean eliminar su cuenta e historial.</li>
            <li><strong>Representantes autorizados:</strong> apoderados o herederos que acrediten representación legal del titular.</li>
          </ul>
        </Section>

        <Section title="3. Canales para presentar la solicitud">
          <p>Puedes solicitar la eliminación de tus datos por cualquiera de estos medios, sin costo alguno:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>
              <strong>Correo electrónico:</strong> escribe a{' '}
              <strong>gerente@appyempresa.digital</strong> con el asunto{' '}
              <em>&quot;Solicitud de eliminación de datos&quot;</em>.
            </li>
            <li>
              <strong>WhatsApp:</strong> envía un mensaje con la palabra{' '}
              <strong>BAJA</strong> al número <strong>+57 310 652 4453</strong>. Este mensaje detiene
              de inmediato futuras comunicaciones y registra tu solicitud de eliminación.
            </li>
            <li>
              <strong>Mediante la organización que te contactó:</strong> si recibiste mensajes de una
              alcaldía, empresa o entidad que usa nuestra plataforma, también puedes pedirle directamente
              que elimine tu registro; dicha organización está obligada a gestionar tu solicitud.
            </li>
          </ul>
        </Section>

        <Section title="4. Información que debe incluir la solicitud">
          <ul style={{ paddingLeft: '20px' }}>
            <li>Nombre completo del titular.</li>
            <li>Dato de contacto por el cual fuiste contactado (número de WhatsApp o correo electrónico).</li>
            <li>Nombre de la organización que envió la comunicación, si lo conoces.</li>
            <li>Documento de identidad, únicamente cuando sea necesario verificar tu identidad para proteger tus datos de solicitudes fraudulentas.</li>
          </ul>
          <p>
            No exigimos formatos especiales ni notarios: basta un mensaje claro por cualquiera de los
            canales del punto 3.
          </p>
        </Section>

        <Section title="5. Procedimiento y plazos">
          <ol style={{ paddingLeft: '20px' }}>
            <li><strong>Recepción:</strong> registramos tu solicitud con fecha y hora de recepción.</li>
            <li><strong>Verificación:</strong> si es necesario, confirmamos tu identidad por el mismo canal de la solicitud (máximo 2 días hábiles).</li>
            <li><strong>Bloqueo de comunicaciones:</strong> en un plazo máximo de 24 horas tu número o correo queda excluido de todas las listas de envío de la plataforma.</li>
            <li><strong>Eliminación o anonimización:</strong> en un plazo máximo de diez (10) días hábiles, contados desde la recepción, eliminamos o anonimizamos definitivamente tus datos de nuestras bases, conforme al artículo 14 de la Ley 1581 de 2012.</li>
            <li><strong>Confirmación:</strong> te informamos por el mismo canal que usaste para solicitarla que la eliminación fue completada.</li>
          </ol>
        </Section>

        <Section title="6. Qué datos se eliminan y excepciones legales">
          <p>Se eliminan, entre otros:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Nombre, teléfono, correo electrónico y organización asociados a tu registro.</li>
            <li>Historial de mensajes enviados y recibidos asociados a tu número o correo.</li>
            <li>Preferencias, etiquetas y notas comerciales asociadas a tu perfil.</li>
          </ul>
          <p>
            <strong>Excepciones:</strong> únicamente conservaremos la información estrictamente necesaria
            cuando una norma legal nos obligue a ello (obligaciones fiscales, contables o judiciales),
            o el registro mínimo que impida volver a tratarte con fines comerciales tras tu solicitud de
            baja. Fuera de esos casos, la eliminación es total.
          </p>
        </Section>

        <Section title="7. Eliminación de datos en Meta (WhatsApp)">
          <p>
            Los mensajes transmitidos por WhatsApp Business API se rigen además por las políticas de
            datos de Meta Platforms, Inc. Si deseas eliminar información asociada a tu cuenta de
            WhatsApp del lado de Meta, puedes hacerlo desde la configuración de tu propia aplicación
            de WhatsApp. Appyempresa no conserva copias de los mensajes fuera de los registros
            operativos descritos en esta página, y los elimina dentro de los plazos aquí indicados.
          </p>
        </Section>

        <Section title="8. Reclamos ante la autoridad">
          <p>
            Si consideras que tu solicitud no fue atendida adecuadamente, puedes presentar un reclamo
            ante la <strong>Superintendencia de Industria y Comercio de Colombia</strong> (www.sic.gov.co),
            una vez agotado el trámite ante el responsable.
          </p>
        </Section>

        <Section title="9. Contacto del responsable">
          <p>
            <strong>Appyempresa S.A.S</strong> · Manizales, Caldas, Colombia<br />
            Correo: <strong>gerente@appyempresa.digital</strong><br />
            WhatsApp: <strong>+57 310 652 4453</strong>
          </p>
        </Section>

        <footer style={{ marginTop: '48px', borderTop: '1px solid #e5e7eb', paddingTop: '24px', color: '#6b7280', fontSize: '13px' }}>
          <p style={{ margin: 0 }}>
            © 2026 Appyempresa S.A.S · Manizales, Caldas, Colombia · gerente@appyempresa.digital · +57 310 652 4453
          </p>
        </footer>
      </article>
    </main>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#111827' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
