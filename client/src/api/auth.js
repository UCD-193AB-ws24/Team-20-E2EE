import { auth } from "../config/firebaseConfig"; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { BACKEND_URL } from "../config/config";

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // console.log("User:", user.uid);

        const idToken = await user.getIdToken();

        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });

        const data = await response.json();

        if (response.ok) {

            // Store user info in localStorage (or sessionStorage)
            localStorage.setItem("user", JSON.stringify(data.user));

            return { success: true, user: data.user };
        } else {
            console.error("Login failed:", data.error);

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

// Sign up function remains the same
export const signUpUser = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const userId = user.uid;
        const idToken = await user.getIdToken();

        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, userId }),
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

// Logout function
export const logoutUser = async () => {
    try {
        await signOut(auth);
        localStorage.removeItem("user"); // Clear stored user data
        return { success: true };
    } catch (error) {
        console.error("Logout error:", error.message);
        return { success: false, error: error.message };
    }
};

// Function to get the current user from localStorage
export const getCurrentUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

// Listen for auth state changes and store user info
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const idToken = await user.getIdToken();
        localStorage.setItem("user", JSON.stringify({ uid: user.uid, email: user.email, emailVerified: user.emailVerified, idToken }));
    } else {
        localStorage.removeItem("user");
    }
});
