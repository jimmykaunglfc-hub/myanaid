/**
 * Firebase is intentionally inactive until values are added to .env.local.
 * Keep this file client-safe: real secret keys must never be committed.
 */
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = isConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

export const auth = app ? getAuth(app) : null;
// The browser running the local preview keeps Firestore's default streaming
// channel open indefinitely. Long polling is more reliable in that environment.
export const db = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalLongPollingOptions: { timeoutSeconds: 25 },
}) : null;
// Callable functions remain server-side; this only provides the authenticated
// client connection to the asia-southeast1 MyanAid Functions region.
export const functions = app ? getFunctions(app, "asia-southeast1") : null;
export const storage = app ? getStorage(app) : null;
export { isConfigured };
