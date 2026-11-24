import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection('webhook_errors')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const errors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      count: errors.length,
      errors: errors
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
