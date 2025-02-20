import { auth } from "../config/firebaseConfig"; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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
            console.error("Login failed:", data.error);
            
            // If the error is due to email verification, return a specific response
            if (data.error === "Email not verified. Please check your email.") {
                return { success: false, error: "Email not verified. Please check your email and verify before logging in." };
            }

            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error("Login error:", error.message);
        return { success: false, error: error.message };
    }
};

export const signUpUser = async (email, password) => {
    try {
        // Sign up user using Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get the Firebase ID Token
        const idToken = await user.getIdToken();

        // Send the ID Token to the backend for verification
        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Signup successful:", data);
            return { success: true, user: data.user };
        } else {
            console.error("Backend authentication failed:", data.error);
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error("Signup error:", error.message);
        return { success: false, error: error.message };
    }

};