// src/app/api/admin/clean-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

function sanitizeEmail(raw: string): { email: string; valid: boolean } {
  if (!raw) return { email: '', valid: false };

  let cleaned = raw
    .replace(/[\r\n\t\u00A0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const separators = /[\s,;]+/;
  if (separators.test(cleaned)) {
    const parts = cleaned.split(separators).filter(p => p.length > 0);
    cleaned = parts[0] || '';
  }

  if (cleaned.toLowerCase().startsWith('mailto:')) {
    cleaned = cleaned.substring(7).trim();
  }

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return { email: cleaned, valid: re.test(cleaned) };
}

/**
 * POST /api/admin/clean-emails?tenantId=XXX&dryRun=true
 * 
 * Parámetros:
 * - tenantId (obligatorio): ID del tenant
 * - dryRun (opcional, default=true): si es true solo muestra qué cambiaría, sin modificar
 * 
 * Este endpoint limpia los emails con espacios/formato inválido en todos los contactos del tenant.
 * Se ejecuta una sola vez para corregir datos ya importados.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const dryRun = searchParams.get('dryRun') !== 'false'; // Por defecto es true

    if (!tenantId) {
      return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
    const contactsRef = db.collection('tenants').doc(tenantId).collection('contacts');
    const snapshot = await contactsRef.get();

    const report = {
      total: snapshot.size,
      cleaned: 0,
      invalid: 0,
      unchanged: 0,
      details: [] as Array<{ id: string; old: string; new: string; valid: boolean }>,
    };

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const oldEmail = (data.email || '') as string;
      const { email: newEmail, valid } = sanitizeEmail(oldEmail);

      if (oldEmail === newEmail && valid) {
        report.unchanged++;
        continue;
      }

      report.details.push({
        id: doc.id,
        old: oldEmail,
        new: newEmail,
        valid,
      });

      if (!valid) {
        report.invalid++;
        if (!dryRun) {
          // Marcar como inválido (vaciar email)
          await doc.ref.update({ email: '', _invalidEmail: oldEmail, updatedAt: new Date().toISOString() });
        }
      } else {
        report.cleaned++;
        if (!dryRun) {
          await doc.ref.update({ email: newEmail, updatedAt: new Date().toISOString() });
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun 
        ? 'Modo simulación: ningún dato fue modificado. Pasa dryRun=false para aplicar cambios.' 
        : 'Limpieza aplicada exitosamente.',
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[clean-emails] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}