import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey } from "@fortawesome/free-solid-svg-icons";
import { signUpUser } from "../api/auth";

export default function SignUp() {
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;

        const result = await signUpUser(email, password);
        if (result.success) {
            navigate("/home"); // Redirect after login
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-[400px] bg-green-200 bg-opacity-30 text-black rounded-xl p-8 shadow-lg">
                <form onSubmit={handleLogin}>
                    <h1 className="text-3xl font-bold text-center">Signup</h1>

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
