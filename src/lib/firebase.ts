import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection } from "firebase/firestore";

// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDF-Whl3SRz_UR-goXyCe5RF08-xBjqlPA",
  authDomain: "studio-3698766353-fe0db.firebaseapp.com",
  projectId: "studio-3698766353-fe0db",
  storageBucket: "studio-3698766353-fe0db.appspot.com",
  messagingSenderId: "82506356249",
  appId: "1:82506356249:web:8ebffdd4a7586d341cfc88"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, collection };
