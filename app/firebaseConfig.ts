// app/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAVfaDk6jrnkUt1MKgi3fbdslPiyj8f3Vo",
  authDomain: "endoprognosis-prod.firebaseapp.com",
  projectId: "endoprognosis-prod",
  storageBucket: "endoprognosis-prod.firebasestorage.app",
  messagingSenderId: "130485316465",
  appId: "1:130485316465:web:67c6c2dba9f6a8caabe4d0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export what you need
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;