// src/app/api/auth/sync-claims/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    // 1. Verificar el token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 2. Obtener datos del usuario desde Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado en Firestore' }, { status: 404 });
    }

    const userData = userDoc.data();
    const customClaims = {
      tenantId: userData?.tenantId || 'master',
      role: userData?.role || 'LECTURA',
    };

    // 3. Verificar si los claims ya están actualizados para evitar escrituras innecesarias
    if (decodedToken.tenantId === customClaims.tenantId && decodedToken.role === customClaims.role) {
      return NextResponse.json({ success: true, message: 'Claims ya actualizados' });
    }

    // 4. Establecer los Custom Claims en Firebase Auth
    await adminAuth.setCustomUserClaims(uid, customClaims);

    return NextResponse.json({ success: true, message: 'Claims actualizados exitosamente' });
  } catch (error) {
    console.error('Error sincronizando claims:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}