import { BACKEND_URL } from "../config/config";


export const loginUser = async (email, password) => {
    try {

        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include", // Include credentials for session management
        });

        const data = await response.json();

        if (response.ok) {
            // Store user info in localStorage (or sessionStorage)
            localStorage.setItem("user", JSON.stringify(data.user));

            return { success: true, user: data.user, warning: data.warning||null };
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

        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
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

