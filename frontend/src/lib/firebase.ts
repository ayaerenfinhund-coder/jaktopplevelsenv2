import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBjD5N84VC1w8lEAcqxvpEY48iSxU3LlCQ",
  authDomain: "jaktopplevelsen-74086.firebaseapp.com",
  projectId: "jaktopplevelsen-74086",
  storageBucket: "jaktopplevelsen-74086.firebasestorage.app",
  messagingSenderId: "137332858130",
  appId: "1:137332858130:web:ce2789a36960d500d427cb"
};

// Debug logging
if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing! Check your .env file.');
} else {
  console.log('Firebase config loaded with API Key:', firebaseConfig.apiKey.substring(0, 5) + '...');
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
