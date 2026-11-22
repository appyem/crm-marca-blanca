const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function updateTenant() {
  const phoneNumberId = '1457831744083668'; // El que obtuviste de Meta
  const tenantId = '43FrPL42q8yLTD6f2vDD'; // Tu tenantId
  
  try {
    await db.collection('tenants').doc(tenantId).update({
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: '1842223083599448',
      whatsappDisplayNumber: '+57 310 652 4453',
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Tenant actualizado con whatsappPhoneNumberId');
  } catch (err) {
    console.error('Error:', err);
  }
}

updateTenant();
