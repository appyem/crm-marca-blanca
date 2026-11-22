// src/app/api/whatsapp/conversations/[conversationId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappConversationService } from '@/services/whatsappConversation.service';
import { ConversationStatus } from '@/types/whatsappConversation.types';

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

interface StatusRequestBody {
  action: 'mark_read' | 'set_status';
  status?: ConversationStatus;
}

const VALID_STATUSES: ConversationStatus[] = ['PENDIENTE', 'EN_CURSO', 'ATENDIDA', 'CERRADA'];

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { conversationId } = await context.params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth } = getFirebaseAdmin();

    let tenantId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      tenantId = decodedToken.tenantId;
      if (!tenantId) throw new Error('Token sin tenantId');
    } catch (authError) {
      console.error('[/api/whatsapp/conversations/status] Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    const body: StatusRequestBody = await request.json();

    if (body.action === 'mark_read') {
      await whatsappConversationService.markAsRead(tenantId, conversationId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (body.action === 'set_status') {
      if (!body.status || !VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Estado inválido. Usa: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      await whatsappConversationService.updateStatus(tenantId, conversationId, body.status);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/conversations/status] POST error:', errorMessage);
    return NextResponse.json({ success: false, error: { message: errorMessage } }, { status: 500 });
  }
}
