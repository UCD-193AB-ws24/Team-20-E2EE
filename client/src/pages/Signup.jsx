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


    const passkeyLogin = () => {
        navigate("/passkeylogin")
    }

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
            <div className="w-[400px] bg-white-200 bg-opacity-30 text-black rounded-xl p-8">
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

                        <div className="flex gap-2 mt-4">
                            {/* Sign-Up Button */}
                            <button type="submit" className="flex-3 w-full h-12 bg-[#002855] text-[#FFBF00] font-bold rounded-md shadow-md mt-4 hover:bg-[#0d3e73] transition">
                                Sign Up
                            </button>

                            <button
                                onClick={passkeyLogin}
                                className="flex-1 w-full h-12 bg-black text-gray-100 font-semibold rounded-md shadow-md mt-4 hover:bg-[#3d3d3d] transition"
                            >
                                Use Passkey
                            </button>
                        </div>

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
