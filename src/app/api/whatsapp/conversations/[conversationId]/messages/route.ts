// src/app/api/whatsapp/conversations/[conversationId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappConversationService } from '@/services/whatsappConversation.service';

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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
      console.error('[/api/whatsapp/conversations/messages] Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    const messages = await whatsappConversationService.getMessagesByConversation(
      tenantId,
      conversationId
    );

    return NextResponse.json(
      { success: true, count: messages.length, messages },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/whatsapp/conversations/messages] GET error:', errorMessage);
    return NextResponse.json({ success: false, error: { message: errorMessage } }, { status: 500 });
  }
}
