// src/app/terms-of-service/page.tsx
// Página PÚBLICA: no requiere autenticación (requisito de Meta para publicar la app)

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Condiciones del Servicio | Appyempresa',
  description: 'Términos y condiciones de uso de la plataforma CRM de Appyempresa S.A.S',
};

export default function TermsOfServicePage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '48px 24px' }}>
      <article style={{ maxWidth: '800px', margin: '0 auto', color: '#111827', lineHeight: 1.7, fontSize: '15px' }}>

        <header style={{ marginBottom: '40px', borderBottom: '2px solid #111827', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Condiciones del Servicio
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Última actualización: 22 de noviembre de 2026
          </p>
        </header>

        <Section title="1. Objeto y aceptación">
          <p>
            Las presentes condiciones regulan el acceso y uso de la plataforma CRM operada por{' '}
            <strong>Appyempresa S.A.S</strong>, sociedad domiciliada en Manizales, Caldas, Colombia.
            El registro, acceso o uso de la plataforma implica la aceptación plena e incondicional de
            estos términos. Si no está de acuerdo con alguna disposición, absténgase de utilizar el servicio.
          </p>
        </Section>

        <Section title="2. Definiciones">
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Plataforma:</strong> aplicación web de gestión de relaciones con clientes (CRM) ofrecida bajo modalidad de software como servicio (SaaS).</li>
            <li><strong>Cliente:</strong> persona natural o jurídica que contrata el servicio y administra una empresa (tenant) dentro de la plataforma.</li>
            <li><strong>Usuario:</strong> persona natural autorizada por el Cliente para acceder a la plataforma con credenciales propias.</li>
            <li><strong>Contacto:</strong> persona natural o jurídica registrada en la base de datos del Cliente.</li>
            <li><strong>Canales de mensajería:</strong> correo electrónico y WhatsApp Business API integrados en la plataforma.</li>
          </ul>
        </Section>

        <Section title="3. Descripción del servicio">
          <p>La plataforma permite al Cliente:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Administrar bases de datos de contactos, empresas y oportunidades comerciales.</li>
            <li>Diseñar y enviar campañas de correo electrónico mediante plantillas con variables dinámicas.</li>
            <li>Enviar mensajes de WhatsApp mediante plantillas aprobadas por Meta Platforms, Inc.</li>
            <li>Consultar métricas de entrega, apertura, clics y estado de conversaciones.</li>
            <li>Importar y exportar información mediante archivos estructurados.</li>
          </ul>
        </Section>

        <Section title="4. Cuentas y seguridad">
          <ul style={{ paddingLeft: '20px' }}>
            <li>Cada Usuario es responsable de la confidencialidad de sus credenciales y de toda actividad realizada bajo su cuenta.</li>
            <li>El Cliente debe notificar de inmediato cualquier uso no autorizado detectado.</li>
            <li>Appyempresa podrá suspender cuentas que presenten actividades fraudulentas, abusivas o contrarias a la ley.</li>
            <li>Los datos de cada Cliente permanecen aislados lógicamente por empresa (tenant) y solo son accesibles para sus Usuarios autorizados.</li>
          </ul>
        </Section>

        <Section title="5. Usos permitidos y prohibidos">
          <p>Queda estrictamente prohibido:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Enviar comunicaciones no autorizadas, spam o contenido engañoso, ofensivo o ilegal.</li>
            <li>Utilizar la plataforma para mensajería masiva hacia titulares que no hayan otorgado consentimiento previo y verificable.</li>
            <li>Intentar acceder a datos de otros tenants o vulnerar las medidas de seguridad.</li>
            <li>Realizar ingeniería inversa, descompilación o reventa no autorizada del servicio.</li>
            <li>Suplantar la identidad de terceros o de Appyempresa en las comunicaciones enviadas.</li>
          </ul>
          <p>
            El incumplimiento de estas prohibiciones faculta a Appyempresa para suspender o terminar
            el servicio sin lugar a reembolsos, sin perjuicio de las acciones legales correspondientes.
          </p>
        </Section>

        <Section title="6. Mensajería por WhatsApp y costos de Meta">
          <ul style={{ paddingLeft: '20px' }}>
            <li>El envío de mensajes de WhatsApp se realiza exclusivamente mediante plantillas aprobadas por Meta Platforms, Inc.</li>
            <li>Las tarifas de conversación que cobra Meta son asumidas por el Cliente mediante el método de pago configurado en su cuenta de WhatsApp Business.</li>
            <li>Appyempresa no controla ni garantiza la entrega de mensajes, la cual depende de la infraestructura y políticas de Meta y del operador del destinatario.</li>
            <li>El Cliente es el único responsable del contenido de los mensajes y de contar con el consentimiento de los destinatarios.</li>
          </ul>
        </Section>

        <Section title="7. Disponibilidad y niveles de servicio">
          <p>
            La plataforma se ofrece bajo esfuerzos comercialmente razonables de disponibilidad continua.
            Podrán presentarse interrupciones por mantenimiento programado (notificado con antelación cuando
            sea posible), fallas de proveedores de infraestructura o causas de fuerza mayor.
          </p>
        </Section>

        <Section title="8. Tarifas y facturación">
          <p>
            El servicio se presta bajo planes suscritos por el Cliente. Las tarifas vigentes se informan
            antes de la contratación y pueden actualizarse con aviso previo de treinta (30) días calendario.
            Los montos cobrados por terceros (Meta, proveedores de correo) no hacen parte de la tarifa de Appyempresa.
          </p>
        </Section>

        <Section title="9. Propiedad intelectual">
          <p>
            La plataforma, su código fuente, diseño, marca y documentación son propiedad exclusiva de
            Appyempresa S.A.S o de sus licenciantes. El Cliente conserva la propiedad plena de la
            información y bases de datos que cargue en la plataforma, otorgando únicamente una licencia
            limitada para procesarlos con el fin de prestar el servicio.
          </p>
        </Section>

        <Section title="10. Protección de datos personales">
          <p>
            El tratamiento de datos personales se rige por la <strong>Política de Privacidad</strong>{' '}
            publicada en esta misma plataforma, conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.
            Ambos documentos forman parte integral de estas condiciones.
          </p>
        </Section>

        <Section title="11. Limitación de responsabilidad">
          <p>
            Appyempresa no responde por lucros cesantes ni daños indirectos o consecuenciales. En ningún
            caso la responsabilidad total acumulada superará el valor de las tarifas pagadas por el
            Cliente durante los tres (3) meses anteriores al hecho que origine el reclamo.
          </p>
        </Section>

        <Section title="12. Vigencia y terminación">
          <p>
            Estas condiciones rigen mientras el Cliente utilice la plataforma. El Cliente puede terminar
            el servicio en cualquier momento solicitando la cancelación de su cuenta. Appyempresa podrá
            terminar el contrato por incumplimiento grave, con aviso previo de cinco (5) días hábiles
            cuando la naturaleza de la falta lo permita.
          </p>
          <p>
            Tras la terminación, el Cliente podrá exportar sus datos durante treinta (30) días calendario;
            vencido el plazo, la información se elimina de forma definitiva.
          </p>
        </Section>

        <Section title="13. Modificaciones">
          <p>
            Appyempresa podrá modificar estas condiciones por cambios legales o funcionales del servicio.
            Las modificaciones sustanciales se notificarán con al menos quince (15) días de antelación al
            correo registrado. El uso continuado implica aceptación de la nueva versión.
          </p>
        </Section>

        <Section title="14. Ley aplicable y jurisdicción">
          <p>
            Estas condiciones se rigen por las leyes de la República de Colombia. Cualquier controversia
            se someterá a las autoridades competentes de la ciudad de Manizales, Caldas, agotando
            previamente una etapa de arreglo directo entre las partes.
          </p>
        </Section>

        <Section title="15. Contacto">
          <p>
            Para notificaciones relacionadas con estas condiciones escriba a{' '}
            <strong>gerente@appyempresa.digital</strong> o llame al <strong>+57 310 652 4453</strong>.
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
