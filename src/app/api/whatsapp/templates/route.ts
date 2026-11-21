// src/app/api/whatsapp/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { whatsappTemplateService } from '@/services/whatsappTemplate.service';
import { WhatsAppTemplateDocument, SyncResult } from '@/types/whatsappTemplate.types';
import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const TEMPLATES_COLLECTION = 'whatsappTemplates';

interface SyncRequestBody {
  action: 'sync';
}

type RequestBody = SyncRequestBody;

/**
 * GET: Lista las plantillas sincronizadas del tenant actual
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticación (mismo patrón que email/send-batch)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth, db } = getFirebaseAdmin();

    let tenantId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      tenantId = decodedToken.tenantId;
      if (!tenantId) throw new Error('Token sin tenantId');
    } catch (authError) {
      console.error('[/api/whatsapp/templates] Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    // 2. Consultar plantillas del tenant
    const templatesRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(TEMPLATES_COLLECTION);

    const snapshot = await templatesRef.orderBy('updatedAt', 'desc').get();

    const templates: WhatsAppTemplateDocument[] = snapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
          metaTemplateId: (data.metaTemplateId as string) || '',
          name: (data.name as string) || '',
          status: data.status as WhatsAppTemplateDocument['status'],
          category: data.category as WhatsAppTemplateDocument['category'],
          language: (data.language as string) || '',
          components: (data.components as WhatsAppTemplateDocument['components']) || [],
          variables: (data.variables as WhatsAppTemplateDocument['variables']) || [],
          previewText: (data.previewText as string) || '',
          headerText: data.headerText as string | undefined,
          footerText: data.footerText as string | undefined,
          hasButtons: (data.hasButtons as boolean) || false,
          createdAt: (data.createdAt as string) || '',
          updatedAt: (data.updatedAt as string) || '',
          lastSyncedAt: (data.lastSyncedAt as string) || '',
        };
      }
    );

    return NextResponse.json(
      {
        success: true,
        count: templates.length,
        templates,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[/api/whatsapp/templates] GET error:', errorMessage);
    return NextResponse.json(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    );
  }
}

/**
 * POST: Sincroniza plantillas desde Meta Business API
 * Body: { "action": "sync" }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth, db } = getFirebaseAdmin();

    let tenantId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      tenantId = decodedToken.tenantId;
      if (!tenantId) throw new Error('Token sin tenantId');
    } catch (authError) {
      console.error('[/api/whatsapp/templates] Error de autenticación:', authError);
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    // 2. Validar body
    const body: RequestBody = await request.json();

    if (body.action !== 'sync') {
      return NextResponse.json(
        { error: 'Acción no soportada. Usa "sync".' },
        { status: 400 }
      );
    }

    // 3. Obtener plantillas de Meta
    let metaTemplates: WhatsAppTemplateDocument[];
    try {
      metaTemplates = await whatsappTemplateService.fetchTemplatesFromMeta();
    } catch (metaError) {
      const message = metaError instanceof Error ? metaError.message : 'Error desconocido';
      console.error('[/api/whatsapp/templates] Error fetching from Meta:', metaError);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Error al consultar Meta: ${message}`,
          },
        },
        { status: 502 }
      );
    }

    // 4. Preparar Firestore
    const templatesRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection(TEMPLATES_COLLECTION);

    // Obtener plantillas existentes para comparar por nombre
    const existingSnapshot = await templatesRef.get();
    const existingMap = new Map<string, string>(); // name -> docId

    existingSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      if (data && typeof data.name === 'string') {
        existingMap.set(data.name, doc.id);
      }
    });

    // 5. Contadores del sync
    const result: SyncResult = {
      success: true,
      templatesSynced: metaTemplates.length,
      added: 0,
      updated: 0,
      errors: [],
      lastSyncedAt: new Date().toISOString(),
    };

    // 6. Ejecutar batch
    const batch = db.batch();

    metaTemplates.forEach((template: WhatsAppTemplateDocument) => {
      try {
        const existingId = existingMap.get(template.name);

        if (existingId) {
          const docRef = templatesRef.doc(existingId);
          batch.update(docRef, {
            metaTemplateId: template.metaTemplateId,
            status: template.status,
            category: template.category,
            language: template.language,
            components: template.components,
            variables: template.variables,
            previewText: template.previewText,
            headerText: template.headerText ?? null,
            footerText: template.footerText ?? null,
            hasButtons: template.hasButtons,
            updatedAt: new Date().toISOString(),
            lastSyncedAt: new Date().toISOString(),
          });
          result.updated++;
        } else {
          const docRef = templatesRef.doc();
          batch.set(docRef, template);
          result.added++;
        }
      } catch (templateError) {
        const message = templateError instanceof Error ? templateError.message : 'Error desconocido';
        result.errors.push(`Plantilla ${template.name}: ${message}`);
      }
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        message: `Sincronización completada: ${result.added} nuevas, ${result.updated} actualizadas`,
        syncResult: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[/api/whatsapp/templates] POST error:', errorMessage);
    return NextResponse.json(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    );
  }
}