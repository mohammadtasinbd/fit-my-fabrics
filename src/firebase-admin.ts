import admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';

import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  try {
    if (serviceAccount) {
      const cert = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(cert),
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized with service account from environment.");
    } else {
      console.log("FIREBASE_SERVICE_ACCOUNT not found, attempting applicationDefault.");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (err) {
    console.error("Firebase Admin initialization failed:", err);
    // Initialize with a dummy app if possible or just let it be handled by the export
    // We don't want to crash the whole process here
  }
}

let adminDb: any;
let adminAuth: any;

try {
  adminDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  adminAuth = admin.auth();
} catch (err) {
  console.error("Failed to get Firestore/Auth from admin app:", err);
  // Mock objects to prevent immediate crashes in routes
  adminDb = {
    collection: () => ({
      doc: () => ({ get: () => Promise.reject(new Error("Firebase Admin not initialized")), set: () => Promise.reject(new Error("Firebase Admin not initialized")) }),
      get: () => Promise.reject(new Error("Firebase Admin not initialized")),
      where: () => ({ get: () => Promise.reject(new Error("Firebase Admin not initialized")), limit: () => ({ get: () => Promise.reject(new Error("Firebase Admin not initialized")) }) }),
      limit: () => ({ get: () => Promise.reject(new Error("Firebase Admin not initialized")) }),
      orderBy: () => ({ get: () => Promise.reject(new Error("Firebase Admin not initialized")) })
    })
  };
  adminAuth = {
    verifyIdToken: () => Promise.reject(new Error("Firebase Admin not initialized"))
  };
}

export { adminDb, adminAuth };

export default admin;
