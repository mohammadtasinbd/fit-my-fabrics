import admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';

import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccount) {
    try {
      const cert = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(cert),
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized with service account from environment.");
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to applicationDefault:", err);
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
    }
  } else {
    console.log("FIREBASE_SERVICE_ACCOUNT not found, using applicationDefault.");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  }
}

export const adminDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
export const adminAuth = admin.auth();

export default admin;
