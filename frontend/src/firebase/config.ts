import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-rpkDMFfAO3aOGczyCJVSYOOL9_nN2K4",
  authDomain: "real-estate-76320.firebaseapp.com",
  projectId: "real-estate-76320",
  storageBucket: "real-estate-76320.firebasestorage.app",
  messagingSenderId: "845623358031",
  appId: "1:845623358031:web:0605c4af7dece433c0f03a",
  measurementId: "G-P4P5L6RJY1",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
