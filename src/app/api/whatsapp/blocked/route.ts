// src/app/api/whatsapp/blocked/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappBlockService } from '@/services/whatsappBlock.service';
import { BLOCK_REASONS, BlockReason } from '@/types/whatsappBlockedNumber.types';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const blockedNumbers = await whatsappBlockService.getBlockedNumbers(auth.tenantId);

    return NextResponse.json({
      success: true,
      count: blockedNumbers.length,
      blockedNumbers,
    }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/blocked GET] Error:', err);
    return NextResponse.json({ error: { message: errorMessage } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, reason, reasonDetails, contactName } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: { message: 'phoneNumber es requerido.' } },
        { status: 400 }
      );
    }

    if (!reason || !BLOCK_REASONS.includes(reason as BlockReason)) {
      return NextResponse.json(
        { error: { message: `reason debe ser una de: ${BLOCK_REASONS.join(', ')}` } },
        { status: 400 }
      );
    }

    const blocked = await whatsappBlockService.blockNumber(
      auth.tenantId,
      {
        phoneNumber,
        reason: reason as BlockReason,
        reasonDetails: reasonDetails || undefined,
        contactName: contactName || undefined,
      },
      auth.uid
    );

    return NextResponse.json({
      success: true,
      blockedNumber: blocked,
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/blocked POST] Error:', err);
    return NextResponse.json({ error: { message: errorMessage } }, { status: 400 });
  }
}
