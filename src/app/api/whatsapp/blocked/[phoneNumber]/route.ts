// src/app/api/whatsapp/blocked/[phoneNumber]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappBlockService } from '@/services/whatsappBlock.service';

async function authenticate(request: NextRequest): Promise<{ tenantId: string; uid: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  const { auth: adminAuth } = getFirebaseAdmin();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      tenantId: decoded.tenantId || '',
      uid: decoded.uid || '',
    };
  } catch {
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ phoneNumber: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { phoneNumber } = await params;
    if (!phoneNumber) {
      return NextResponse.json(
        { error: { message: 'phoneNumber es requerido.' } },
        { status: 400 }
      );
    }

    const wasUnblocked = await whatsappBlockService.unblockNumber(auth.tenantId, phoneNumber);

    if (!wasUnblocked) {
      return NextResponse.json(
        { error: { message: 'El número no estaba bloqueado.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Número desbloqueado correctamente.',
      phoneNumber,
    }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/blocked DELETE] Error:', err);
    return NextResponse.json({ error: { message: errorMessage } }, { status: 500 });
  }
}
