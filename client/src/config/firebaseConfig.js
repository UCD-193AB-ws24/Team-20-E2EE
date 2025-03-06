// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "capstonee2ee.firebaseapp.com",
    projectId: "capstonee2ee",
    storageBucket: "capstonee2ee.appspot.com",
    messagingSenderId: "372939690214",
    appId: "1:372939690214:web:a958e6b972d3de45232b27",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export Firebase Auth instance
export const auth = getAuth(app);
