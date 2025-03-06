import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey } from "@fortawesome/free-solid-svg-icons";
import { signUpUser } from "../api/auth";
import EmailVerificationMessage from "../components/EmailVerificationMessage";

export default function SignUp() {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [verificationRequired, setVerificationRequired] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;

        const result = await signUpUser(email, password);
        if (result.success) {
            setVerificationRequired(true); // Show email verification message
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-[400px] bg-green-200 bg-opacity-30 text-black rounded-xl p-8 shadow-lg">
                <h1 className="text-3xl font-bold text-center">Sign Up</h1>

                {/* Email Verification Message (Displayed Only If Needed) */}
                {verificationRequired && <EmailVerificationMessage />}

                {/* Sign-Up Form */}
                {!verificationRequired && (
                    <form onSubmit={handleSignUp}>
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

                        {/* Sign-Up Button */}
                        <button type="submit" className="w-full h-12 bg-white text-gray-700 font-bold rounded-full shadow-md mt-4 hover:bg-gray-200 transition">
                            Sign Up
                        </button>

                        {/* Login Link */}
                        <span>Already have an account? <Link to="/login" className="text-blue-500 underline">Login</Link></span>


                        {/* Error Message (If Any) */}
                        {error && <p style={{ color: "red" }}>{error}</p>}
                    </form>
                )}
            </div>
        </div>
    );
}
