// src/app/privacy-policy/page.tsx
// Página PÚBLICA: no requiere autenticación (requisito de Meta para publicar la app)

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Appyempresa',
  description: 'Política de tratamiento de datos personales de Appyempresa S.A.S',
};

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '48px 24px' }}>
      <article style={{ maxWidth: '800px', margin: '0 auto', color: '#111827', lineHeight: 1.7, fontSize: '15px' }}>

        <header style={{ marginBottom: '40px', borderBottom: '2px solid #111827', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Política de Privacidad y Tratamiento de Datos Personales
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Última actualización: 22 de noviembre de 2026
          </p>
        </header>

        <Section title="1. Responsable del tratamiento">
          <p>
            <strong>Appyempresa S.A.S</strong>, sociedad constituida en la República de Colombia, con domicilio
            principal en Manizales, departamento de Caldas, es el responsable del tratamiento de los datos
            personales recogidos a través de esta plataforma CRM y de los servicios de mensajería y correo
            electrónico asociados.
          </p>
          <p>
            Contacto para ejercicio de derechos: <strong>gerente@appyempresa.digital</strong> ·
            Teléfono: <strong>+57 310 652 4453</strong>
          </p>
        </Section>

        <Section title="2. Datos personales que recopilamos">
          <p>Tratamos únicamente los datos necesarios para la prestación del servicio:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Datos de identificación:</strong> nombre, apellido, cargo y organización.</li>
            <li><strong>Datos de contacto:</strong> correo electrónico y número de teléfono.</li>
            <li><strong>Datos de cuenta:</strong> credenciales de acceso, rol y empresa (tenant) asociada.</li>
            <li><strong>Datos de uso:</strong> registros de envío, apertura y lectura de mensajes de correo y WhatsApp generados por la plataforma.</li>
            <li><strong>Contenido de mensajes:</strong> texto de las comunicaciones enviadas y recibidas a través de los canales habilitados por el cliente del servicio.</li>
          </ul>
        </Section>

        <Section title="3. Finalidades del tratamiento">
          <ul style={{ paddingLeft: '20px' }}>
            <li>Prestar el servicio de gestión de relaciones con clientes (CRM) contratado.</li>
            <li>Enviar comunicaciones comerciales, informativas o transaccionales en nombre de nuestros clientes, mediante correo electrónico y WhatsApp Business API, previa autorización del titular.</li>
            <li>Autenticar el acceso a la plataforma y garantizar la seguridad de la información.</li>
            <li>Cumplir obligaciones legales y requerimientos de autoridades competentes.</li>
            <li>Elaborar estadísticas de uso agregadas y anónimas para la mejora del servicio.</li>
          </ul>
        </Section>

        <Section title="4. Base legal (Ley 1581 de 2012)">
          <p>
            El tratamiento se fundamenta en la autorización previa, expresa e informada del titular,
            otorgada al momento del registro en la plataforma o al aceptar el envío de comunicaciones.
            Los titulares conservan en todo momento la facultad de revocar dicha autorización.
          </p>
        </Section>

        <Section title="5. Compartición de datos con encargados y terceros">
          <p>Para operar el servicio contamos con los siguientes encargados del tratamiento:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Meta Platforms, Inc. (WhatsApp Business API):</strong> transmisión y entrega de mensajes de WhatsApp.</li>
            <li><strong>Google LLC (Firebase):</strong> autenticación de usuarios y almacenamiento de bases de datos.</li>
            <li><strong>Vercel Inc.:</strong> alojamiento y despliegue de la aplicación web.</li>
            <li><strong>Resend Inc.:</strong> infraestructura de envío de correo electrónico.</li>
          </ul>
          <p>
            No vendemos ni alquilamos datos personales a terceros. Cada encargado cuenta con políticas
            de privacidad propias disponibles públicamente.
          </p>
        </Section>

        <Section title="6. Mensajería por WhatsApp Business API">
          <ul style={{ paddingLeft: '20px' }}>
            <li>Los mensajes iniciados por una organización se envían únicamente mediante plantillas previamente aprobadas por Meta y dirigidas a titulares que otorgaron consentimiento.</li>
            <li>Cuando un titular responde, se abre una ventana de conversación de 24 horas durante la cual puede recibir respuestas del agente autorizado.</li>
            <li>El titular puede solicitar en cualquier momento la exclusión de futuras comunicaciones escribiendo la palabra BAJA al número remitente.</li>
          </ul>
        </Section>

        <Section title="7. Seguridad de la información">
          <p>
            Aplicamos medidas técnicas y organizativas proporcionales al riesgo: cifrado en tránsito (TLS),
            control de acceso por roles y por empresa (tenant), registro de auditoría de operaciones y
            almacenamiento en infraestructura certificada. Ningún dato se almacena en dispositivos no autorizados.
          </p>
        </Section>

        <Section title="8. Conservación de los datos">
          <p>
            Los datos se conservan mientras subsista la relación contractual o la finalidad que justificó
            su recolección. Cumplido el plazo legal o revocada la autorización, se procede a su supresión
            o anonimización definitiva.
          </p>
        </Section>

        <Section title="9. Derechos de los titulares">
          <p>De conformidad con la Ley 1581 de 2012, el titular puede:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Conocer, actualizar y rectificar sus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Revocar la autorización o solicitar la supresión de sus datos.</li>
            <li>Abstenerse de responder preguntas sobre datos sensibles.</li>
            <li>Presentar consultas y reclamos ante el responsable y ante la Superintendencia de Industria y Comercio.</li>
          </ul>
          <p>
            Las solicitudes se atienden en un plazo máximo de diez (10) días hábiles mediante correo a{' '}
            <strong>gerente@appyempresa.digital</strong>.
          </p>
        </Section>

        <Section title="10. Cookies y tecnologías similares">
          <p>
            La plataforma utiliza cookies técnicas indispensables para mantener la sesión del usuario
            autenticado y garantizar la seguridad. No se emplean cookies publicitarias ni de rastreo
            de terceros con fines de perfilamiento.
          </p>
        </Section>

        <Section title="11. Menores de edad">
          <p>
            El servicio está dirigido exclusivamente a personas jurídicas y personas naturales mayores
            de edad en ejercicio de funciones comerciales o institucionales. No recopilamos
            deliberadamente datos de menores.
          </p>
        </Section>

        <Section title="12. Cambios a esta política">
          <p>
            Cualquier modificación sustancial será publicada en esta misma página con su nueva fecha de
            actualización. El uso continuado del servicio tras la publicación implica la aceptación de
            la versión vigente.
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
