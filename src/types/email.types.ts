// src/types/email.types.ts

export interface EmailTemplate {
  id: string;
  tenantId: string; // OBLIGATORIO: Aislamiento multi-tenant
  name: string; // Ej: "Bienvenida nuevo cliente"
  subject: string; // Ej: "¡Bienvenido a {{empresa}}!"
  body: string; // Contenido HTML o texto plano con variables {{nombre}}
  variables: string[]; // Ej: ["nombre", "empresa"]
  isActive: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type EmailStatus = 
  | 'PENDING'    // En cola para enviar
  | 'SENT'       // Enviado exitosamente
  | 'FAILED'     // Error en el envío
  | 'BOUNCED'    // Rechazado por el servidor destino
  | 'OPENED';    // El destinatario lo abrió

export interface EmailLog {
  id: string;
  tenantId: string; // OBLIGATORIO
  templateId?: string; // Opcional: si se usó una plantilla guardada
  contactId?: string; // Opcional: vinculación con el CRM
  to: string; // Correo del destinatario
  subject: string; // Asunto final renderizado
  body: string; // Cuerpo final renderizado (con las variables reemplazadas)
  status: EmailStatus;
  errorMessage?: string; // Si falló, por qué
  sentAt?: string; // ISO timestamp de cuando se envió realmente
  createdAt: string; // ISO timestamp de cuando se creó el registro
}