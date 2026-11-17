// src/services/import.service.ts
import * as XLSX from 'xlsx';
import { ContactType } from '@/types/crm.types';

export interface ParsedContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  type: ContactType;
  rowNumber: number;
  isValid: boolean;
  error?: string;
}

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['nombre', 'nombres', 'name', 'first name', 'firstname'],
  lastName: ['apellido', 'apellidos', 'last name', 'lastname', 'surname'],
  email: ['email', 'correo', 'e-mail', 'mail', 'correo electronico'],
  phone: ['telefono', 'phone', 'celular', 'movil', 'whatsapp', 'tel'],
  companyName: ['empresa', 'company', 'compania', 'organizacion', 'negocio'],
  type: ['tipo', 'type'],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Sanitiza un email:
 * - Remueve espacios, saltos de línea, tabs
 * - Remueve el prefijo "mailto:" si existe
 * - Si hay múltiples emails separados, toma solo el primero
 * - Valida formato
 */
function sanitizeEmail(raw: string): { email: string; valid: boolean; error?: string } {
  if (!raw) return { email: '', valid: false };

  // Limpiar: quitar saltos de línea, tabs, espacios no-breaking (U+00A0)
  let cleaned = raw
    .replace(/[\r\n\t\u00A0]/g, ' ')  // saltos de línea y espacios raros → espacio
    .replace(/\s+/g, ' ')              // múltiples espacios → uno
    .trim();

  // Si contiene varios emails (separados por espacio, coma, punto y coma), tomar el primero
  const separators = /[\s,;]+/;
  if (separators.test(cleaned)) {
    const parts = cleaned.split(separators).filter(p => p.length > 0);
    cleaned = parts[0] || '';
  }

  // Remover prefijo "mailto:" si existe
  if (cleaned.toLowerCase().startsWith('mailto:')) {
    cleaned = cleaned.substring(7).trim();
  }

  // Validar formato
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(cleaned)) {
    return { email: cleaned, valid: false, error: 'Correo con formato inválido.' };
  }

  return { email: cleaned, valid: true };
}

function sanitizeString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const str = typeof raw === 'string' ? raw : String(raw);
  return str
    .replace(/[\u00A0\r\n\t]/g, ' ')  // espacios raros → espacio normal
    .replace(/\s+/g, ' ')
    .trim();
}

export const importService = {
  async parseExcelFile(file: File): Promise<ParsedContact[]> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return [];
    }

    const originalHeaders = Object.keys(rawRows[0]);
    const headerMap: Record<string, string> = {};

    for (const original of originalHeaders) {
      const normalized = normalizeHeader(original);
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.map(normalizeHeader).includes(normalized)) {
          headerMap[field] = original;
        }
      }
    }

    const results: ParsedContact[] = [];

    rawRows.forEach((row, index) => {
      const getValue = (field: string): string => {
        const originalHeader = headerMap[field];
        if (!originalHeader) return '';
        return sanitizeString(row[originalHeader]);
      };

      const firstName = getValue('firstName');
      const rawEmail = getValue('email');
      const { email, valid: emailValid, error: emailError } = sanitizeEmail(rawEmail);

      let isValid = true;
      let error: string | undefined;

      if (!firstName && !email) {
        isValid = false;
        error = 'Falta nombre y correo electrónico.';
      } else if (rawEmail && !emailValid) {
        isValid = false;
        error = emailError || 'Correo con formato inválido.';
      }

      const rawType = getValue('type').toUpperCase();
      const type: ContactType =
        rawType === 'PROSPECT' || rawType === 'CLIENT' ? (rawType as ContactType) : 'LEAD';

      results.push({
        firstName,
        lastName: getValue('lastName'),
        email,
        phone: getValue('phone'),
        companyName: getValue('companyName'),
        type,
        rowNumber: index + 2,
        isValid,
        error,
      });
    });

    return results;
  },

  downloadTemplate(): void {
    const template = [
      {
        Nombre: 'Juan',
        Apellido: 'Pérez',
        Email: 'juan@empresa.com',
        Telefono: '3001234567',
        Empresa: 'Acme Corp',
        Tipo: 'LEAD',
      },
      {
        Nombre: 'María',
        Apellido: 'Gómez',
        Email: 'maria@empresa.com',
        Telefono: '3007654321',
        Empresa: 'Beta Ltda',
        Tipo: 'CLIENT',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contactos');
    XLSX.writeFile(workbook, 'plantilla_contactos.xlsx');
  },
};