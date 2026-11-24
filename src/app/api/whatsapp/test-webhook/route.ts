import { NextRequest, NextResponse } from 'next/server';
import { whatsappWebhookService } from '@/services/whatsappWebhook.service';

export async function GET(request: NextRequest) {
  const results: any[] = [];
  
  try {
    results.push({ step: '1. Iniciando test', status: 'OK' });
    
    // Simular exactamente lo que Meta envía
    const testPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '1842223083599448',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '573106524453',
              phone_number_id: '1457831744083668'
            },
            contacts: [{
              wa_id: '447710173736',
              user_id: 'GB.1449179566862793',
              profile: { name: 'Test User' }
            }],
            messages: [{
              from: '447710173736',
              from_user_id: 'GB.1449179566862793',
              id: `test_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: { body: '79081 es tu código de confirmación de Facebook' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    
    results.push({ step: '2. Payload creado', status: 'OK' });
    
    // Intentar procesar
    const processResult = await whatsappWebhookService.processPayload(testPayload as any);
    
    results.push({ 
      step: '3. Proceso completado', 
      status: processResult.failed > 0 ? 'FAILED' : 'SUCCESS',
      result: processResult
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test completado',
      results,
      finalResult: processResult
    });
    
  } catch (error: any) {
    results.push({ 
      step: 'ERROR', 
      status: 'EXCEPTION',
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: false,
      message: 'Error en test',
      results,
      error: error.message
    }, { status: 500 });
  }
}
