import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgPYbt1UNuq8E58voTLeHaEMeQLadoJDo",
  authDomain: "jornal-btb.firebaseapp.com",
  projectId: "jornal-btb",
  storageBucket: "jornal-btb.firebasestorage.app",
  messagingSenderId: "957675815768",
  appId: "1:957675815768:web:51d8f9b4ff94f18db7db2d",
  measurementId: "G-PKZ886EMNR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
