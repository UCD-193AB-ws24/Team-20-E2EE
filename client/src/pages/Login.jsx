import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey } from "@fortawesome/free-solid-svg-icons";
import { loginUser } from "../api/auth";

export default function Login() {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [verificationRequired, setVerificationRequired] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;

        const result = await loginUser(email, password);
        if (result.success) {
            navigate("/"); // Redirect to home after successful login
        } else if (result.error === "Email not verified. Please check your email.") {
            setVerificationRequired(true); // Show email verification message
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-[400px] bg-green-200 bg-opacity-30 text-black rounded-xl p-8 shadow-lg">
                <h1 className="text-3xl font-bold text-center">Login</h1>

                {/* Login Form */}
                {!verificationRequired && (
                    <form onSubmit={handleLogin}>
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

                        {/* Signup Link */}
                        <span>Don't have an account? <Link to="/signup" className="text-blue-500 underline">Sign Up</Link></span>

                        {/* Error Message (If Any) */}
                        {verificationRequired ? (
                            <p style={{ color: "yellow" }}>Email not verified. Please check your email.</p>
                        ) : error ? (
                            <p style={{ color: "red" }}>{error}</p>
                        ) : null}
                    </form>
                )}
            </div>
        </div>
    );
}
