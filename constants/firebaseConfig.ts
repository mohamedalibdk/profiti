// app/constants/firebaseConfig.ts

import auth from '@react-native-firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth as getWebAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAQCADhu6fyt5WdtrkJO1hoy_uV47dLA5I",
  authDomain: "test-64d29.firebaseapp.com",
  projectId: "test-64d29",
  storageBucket: "test-64d29.firebasestorage.app",
  messagingSenderId: "922634174596",
  appId: "1:922634174596:web:22fbcdf8dd327c16c842d1"
};

// ✅ Initialize app only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Unified auth for Web & Mobile
const firebaseAuth =
  Platform.OS === 'web'
    ? getWebAuth(app)
    : auth();

// ✅ Firestore & Storage
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Exports
export { firebaseAuth as auth, db, storage };

