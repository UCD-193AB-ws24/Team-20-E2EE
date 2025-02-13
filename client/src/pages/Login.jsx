import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey } from "@fortawesome/free-solid-svg-icons";
import { auth } from "../firebaseConfig"; 
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;

        try {
            // Sign in user using Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 🔹 Get the Firebase ID Token
            const idToken = await user.getIdToken();

            // 🔹 Send the ID Token to the backend for verification
            const response = await fetch("http://localhost:5001/api/auth/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ idToken }),  // ✅ Send the token to the backend
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful:", data);
                navigate("/home"); // Redirect after login
            } else {
                console.error("Backend authentication failed:", data.error);
                alert("Login failed: " + data.error);
            }
        } catch (error) {
            console.error("Login error:", error.message);
            alert("Login failed: " + error.message);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-[400px] bg-green-200 bg-opacity-30 text-black rounded-xl p-8 shadow-lg">
                <form onSubmit={handleLogin}>
                    <h1 className="text-3xl font-bold text-center">Login</h1>

                    {/* Email Input */}
                    <div className="relative w-full h-12 mt-6">
                        <input 
                            type="email" 
                            placeholder="Email" 
                            required 
                            className="w-full h-full bg-transparent border-2 border-gray-300 rounded-full px-6 text-lg outline-none focus:border-green-600 transition"
                        />
                        <FontAwesomeIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600" icon={faUser} />
                    </div>

                    {/* Password Input */}
                    <div className="relative w-full h-12 mt-6">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            required 
                            className="w-full h-full bg-transparent border-2 border-gray-300 rounded-full px-6 text-lg outline-none focus:border-green-600 transition"
                        />
                        <FontAwesomeIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600" icon={faKey} />
                    </div>

                    {/* Login Button */}
                    <button type="submit" className="w-full h-12 bg-white text-gray-700 font-bold rounded-full shadow-md mt-4 hover:bg-gray-200 transition">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
