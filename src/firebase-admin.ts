import admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';

import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

export const adminDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
export const adminAuth = admin.auth();

export default admin;
