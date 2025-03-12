import { auth } from "../config/firebaseConfig"; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { BACKEND_URL } from "../config/config";

export const loginUser = async (email, password) => {
    try {
        console.log("Attempting to sign in with Firebase...");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Firebase authentication successful for:", email);

        // Get the ID token
        console.log("Requesting ID token...");
        const idToken = await user.getIdToken();
        console.log("ID token received with length:", idToken?.length);

        // Log API endpoint for debugging
        console.log("Using backend URL:", BACKEND_URL);
        console.log("Sending authentication request to:", `${BACKEND_URL}/api/auth/login`);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json" 
                },
                body: JSON.stringify({ idToken }),
                credentials: 'include' // Include cookies if your server uses them
            });

            console.log("Backend response received with status:", response.status);
            
            const data = await response.json();
            console.log("Response data:", data);

            if (response.ok) {
                console.log("Login successful");
                // Store user info in localStorage
                localStorage.setItem("user", JSON.stringify(data.user));
                return { success: true, user: data.user, warning: data.warning || null };
            } else {
                console.error("Login failed from backend:", data.error);

                if (data.error === "Email not verified. Please check your email.") {
                    return { success: false, error: "Email not verified. Please check your email and verify before logging in." };
                }

                return { success: false, error: `Backend error: ${data.error}` };
            }
        } catch (networkError) {
            console.error("Network error details:", networkError);
            
            // Check if BACKEND_URL is correctly set
            console.log("Checking BACKEND_URL:", {
                isDefined: !!BACKEND_URL,
                value: BACKEND_URL,
                fromEnv: import.meta.env.VITE_BACKEND_URL
            });
            
            return { 
                success: false, 
                error: "Cannot connect to the server. Please check your internet connection and make sure the server is running." 
            };
        }
    } catch (error) {
        console.error("Firebase login error:", error);
        
        // Provide more specific error messages based on Firebase error codes
        if (error.code === 'auth/user-not-found') {
            return { success: false, error: "No user found with this email address." };
        } else if (error.code === 'auth/wrong-password') {
            return { success: false, error: "Incorrect password. Please try again." };
        } else if (error.code === 'auth/invalid-credential') {
            return { success: false, error: "Invalid login credentials. Please check your email and password." };
        } else if (error.code === 'auth/too-many-requests') {
            return { success: false, error: "Too many failed login attempts. Please try again later or reset your password." };
        } else if (error.code === 'auth/network-request-failed') {
            return { success: false, error: "Network error connecting to authentication service. Please check your internet connection." };
        }
        
        return { success: false, error: `Authentication error: ${error.message}` };
    }
};

// Other functions remain the same...
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
