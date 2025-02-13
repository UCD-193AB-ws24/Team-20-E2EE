import { auth } from "../config/firebaseConfig"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import {BACKEND_URL} from "../config/config";
export const loginUser = async (email, password) => {
    try {
        // Sign in user using Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get the Firebase ID Token
        const idToken = await user.getIdToken();

        // Send the ID Token to the backend for verification
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Login successful:", data);
            return { success: true, user: data.user };
        } else {
            console.error("Backend authentication failed:", data.error);
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error("Login error:", error.message);
        return { success: false, error: error.message };
    }
};