// app/predictor/result/firebaseConfig.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCpVnYczXq9rkYfXuLzqnNRIs2B98Fc58g",
  authDomain: "endoprognosis.firebaseapp.com",
  projectId: "endoprognosis",
  storageBucket: "endoprognosis.firebasestorage.app",
  messagingSenderId: "532629764609",
  appId: "1:532629764609:web:cd8f39794fbd079b731e00",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services we need
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;