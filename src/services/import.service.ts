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

// Alias de encabezados aceptados (sin importar mayúsculas ni tildes)
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

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export const importService = {
  /**
   * Lee un archivo Excel/CSV y lo convierte en una lista de contactos validados.
   */
  async parseExcelFile(file: File): Promise<ParsedContact[]> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return [];
    }

    // Mapear encabezados del archivo a nuestros campos
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
        const value = row[originalHeader];
        return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
      };

      const email = getValue('email');
      const firstName = getValue('firstName');

      let isValid = true;
      let error: string | undefined;

      if (!firstName && !email) {
        isValid = false;
        error = 'Falta nombre y correo electrónico.';
      } else if (email && !isValidEmail(email)) {
        isValid = false;
        error = 'Correo con formato inválido.';
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
        rowNumber: index + 2, // +2 porque Excel empieza en fila 1 y tiene encabezados
        isValid,
        error,
      });
    });

    return results;
  },

  /**
   * Descarga una plantilla de Excel lista para llenar.
   */
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