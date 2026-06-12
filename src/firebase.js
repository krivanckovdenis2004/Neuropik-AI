import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA6xWYjS0nn6k3w8ZEtAUnZ44-9fDphyfg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'neuropik-ai.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'neuropik-ai',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'neuropik-ai.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '174890304616',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:174890304616:web:f4e41b54942d7e270c67dd'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Firebase auth persistence error:', error);
});
export const db = getFirestore(app);
