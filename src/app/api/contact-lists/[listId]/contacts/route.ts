// src/app/api/contact-lists/[listId]/contacts/route.ts
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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { listId } = await context.params;
    const tenantId = await authenticate(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de contactIds.' }, { status: 400 });
    }

    const result = await contactListService.addContacts(tenantId, listId, contactIds);
    return NextResponse.json({ success: true, added: result.added }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/contact-lists/[listId]/contacts] POST error:', message);
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

    const body = await request.json();
    const { contactIds } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de contactIds.' }, { status: 400 });
    }

    const result = await contactListService.removeContacts(tenantId, listId, contactIds);
    return NextResponse.json({ success: true, removed: result.removed }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/contact-lists/[listId]/contacts] DELETE error:', message);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
