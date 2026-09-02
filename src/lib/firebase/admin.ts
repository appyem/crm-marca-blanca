// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

export function getFirebaseAdmin() {
  // Inicializar solo si no existe una instancia previa (evita errores en desarrollo con hot-reload)
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    // Reemplazamos los saltos de línea literales '\n' por saltos de línea reales para que la clave sea válida
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Faltan variables de entorno obligatorias de Firebase Admin. Revisa tu .env.local');
    }

    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    adminApp = getApps()[0];
  }

  return {
    app: adminApp,
    db: getFirestore(adminApp),
    auth: getAuth(adminApp),
  };
}