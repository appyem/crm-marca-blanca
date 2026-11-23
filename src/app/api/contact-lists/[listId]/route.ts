// src/app/api/contact-lists/[listId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { contactListService } from '@/services/contactList.service';

interface RouteContext {
  params: Promise<{ listId: string }>;
}

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

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { listId } = await context.params;
    const tenantId = await authenticate(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre del listado es obligatorio.' }, { status: 400 });
    }

    await contactListService.update(tenantId, listId, {
      name: name.trim(),
      description: description?.trim() || undefined,
      color: color || undefined,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/contact-lists/[listId]] PUT error:', message);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { listId } = await context.params;
    const tenantId = await authenticate(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await contactListService.delete(tenantId, listId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/contact-lists/[listId]] DELETE error:', message);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
