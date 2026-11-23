// src/app/api/contact-lists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { contactListService } from '@/services/contactList.service';
import { ContactListInput } from '@/types/contactList.types';

async function authenticate(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split('Bearer ')[1];
  const { auth: adminAuth } = getFirebaseAdmin();

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.tenantId || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await authenticate(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const lists = await contactListService.getListsByTenant(tenantId);
    return NextResponse.json({ success: true, count: lists.length, lists }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/contact-lists] GET error:', message);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await authenticate(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre del listado es obligatorio.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const input: ContactListInput = {
      tenantId,
      name: name.trim(),
      description: description?.trim() || undefined,
      color: color || '#3b82f6',
      contactCount: 0,
      createdBy: 'user',
      createdAt: now,
      updatedAt: now,
    };

    const listId = await contactListService.create(input);
    return NextResponse.json({ success: true, listId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/contact-lists] POST error:', message);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
