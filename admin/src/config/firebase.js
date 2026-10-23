import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyClcXmn9O1gO-MF2AMXwpUw6TZjzSmtszg",
  authDomain: "ecommerce-mern-main.firebaseapp.com",
  projectId: "ecommerce-mern-main",
  storageBucket: "ecommerce-mern-main.firebasestorage.app",
  messagingSenderId: "145502762750",
  appId: "1:145502762750:web:38ef31d25fe7f400d617af",
  measurementId: "G-9R6X0HMDMY",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
