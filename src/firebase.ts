import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
 apiKey: "AIzaSyCUFZL66Bf_HjkWO0IbpXMuXkcDwwDG1QU",
  authDomain: "faas-9c562.firebaseapp.com",
  databaseURL: "https://faas-9c562-default-rtdb.firebaseio.com",
  projectId: "faas-9c562",
  storageBucket: "faas-9c562.firebasestorage.app",
  messagingSenderId: "593019462213",
  appId: "1:593019462213:web:c88be1a1613dc0d6d4392c",
  measurementId: "G-0ZHL9D5ZHC"
};

export const firebaseReady = Object.values(firebaseConfig).every(Boolean);
const app = firebaseReady ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export function requireFirebase<T>(service:T|null):T {
  if (!service) throw new Error('Firebase is not configured yet. Add the VITE_FIREBASE_* values to .env.local.');
  return service;
}
