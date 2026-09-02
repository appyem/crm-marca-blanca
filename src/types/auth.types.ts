// src/types/auth.types.ts

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'GERENTE'
  | 'SUPERVISOR'
  | 'COMERCIAL'
  | 'MARKETING'
  | 'SOPORTE'
  | 'AGENTE'
  | 'LECTURA';

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  tenantId: string;
}

export interface AuthError {
  code: string;
  message: string;
}