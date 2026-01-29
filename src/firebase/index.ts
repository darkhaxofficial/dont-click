import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let firebaseInstances: FirebaseInstances | null = null;

export function initializeFirebase(): FirebaseInstances {
  if (typeof window !== 'undefined') {
    if (firebaseInstances) {
      return firebaseInstances;
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    firebaseInstances = { app, auth, db };
    return firebaseInstances;
  }
  // On the server, we don't initialize Firebase.
  // This is a client-side only setup.
  // To satisfy TypeScript, we return a "dummy" object.
  // This code path should not be hit in a client component.
  return {
      app: null as any,
      auth: null as any,
      db: null as any,
  }
}

export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
