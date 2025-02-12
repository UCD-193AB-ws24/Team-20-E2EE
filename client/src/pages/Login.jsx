import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faKey } from '@fortawesome/free-solid-svg-icons';

export default function Login() {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        navigate('/home');
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-[400px] bg-green-200 bg-opacity-30 text-black rounded-xl p-8 shadow-lg">
                <form onSubmit={handleLogin}>
                    <h1 className="text-3xl font-bold text-center">Login</h1>

                    {/* Username Input */}
                    <div className="relative w-full h-12 mt-6">
                        <input 
                            type="text" 
                            placeholder="Username" 
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

                    {/* Remember Me & Forgot Password */}
                    <div className="flex justify-between text-sm mt-4">
                        <label className="flex items-center">
                            <input type="checkbox" className="mr-2" />
                            Remember me
                        </label>
                        <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
                    </div>

                    {/* Login Button */}
                    <button type="submit" className="w-full h-12 bg-white text-gray-700 font-bold rounded-full shadow-md mt-4 hover:bg-gray-200 transition">
                        Login
                    </button>
                </form>

                {/* Register Link */}
                <div className="text-sm text-center mt-6">
                    <p>Don't have an account? <a href="#" className="text-blue-600 font-semibold hover:underline">Register</a></p>
                </div>
            </div>
        </div>
    );
}
