// src/app/api/admin/create-tenant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { auth: adminAuth, db } = getFirebaseAdmin();

    // 1. Validar autenticación y rol
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (decodedToken.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo el Super Admin puede crear tenants' }, { status: 403 });
    }

    // 2. Obtener datos
    const body = await request.json();
    const { tenantName, domain, plan, limits, adminEmail, adminPassword, adminName } = body;

    if (!tenantName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // 3. Generar ID del tenant basado en el dominio (Consistente con tenant.service.ts)
    const tenantId = (domain || tenantName).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const now = new Date().toISOString();

    // 4. Crear usuario en Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName || 'Administrador',
    });

    // 5. Crear documento del Tenant con la estructura EXACTA de tu interfaz Tenant
    await db.collection('tenants').doc(tenantId).set({
      name: tenantName,
      domain: domain || '',
      plan: plan || 'FREE',
      status: 'ACTIVE',
      limits: limits || { 
        maxUsers: 10, 
        maxContacts: 1000, 
        maxCampaigns: 10,
        maxEmailsPerMonth: 5000, 
        maxWhatsAppMessagesPerMonth: 2000,
        maxStorageMB: 1000 
      },
      settings: {
        branding: {},
        email: {},
        whatsapp: {},
      },
      createdAt: now,
      updatedAt: now,
    });

    // 6. Crear documento del Usuario
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: adminEmail,
      displayName: adminName || 'Administrador',
      role: 'ADMIN',
      tenantId: tenantId,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Actualizar Custom Claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'ADMIN',
      tenantId: tenantId,
    });

    return NextResponse.json({ success: true, tenantId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en API create-tenant:', errorMessage);
    
    if (errorMessage.includes('EMAIL_ALREADY_EXISTS')) {
      return NextResponse.json({ error: 'El correo del administrador ya está en uso.' }, { status: 400 });
    }

    return NextResponse.json({ error: `Error interno: ${errorMessage}` }, { status: 500 });
  }
}