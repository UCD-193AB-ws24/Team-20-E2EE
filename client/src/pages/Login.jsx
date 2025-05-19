import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey } from "@fortawesome/free-solid-svg-icons";
import { loginUser } from "../api/auth";
import { useAppContext } from "../components";

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const { login } = useAppContext();

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    // Use the login function from AppContext
    const result = await login(email, password);

    if (result.success) {
      navigate("/"); // Navigate to the home page after successful login
    } else if (
      result.error === "Email not verified. Please check your email."
    ) {
      setVerificationRequired(true); // Show email verification message
    } else {
      setError(result.error); // Display other errors
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center z-0"
        style={{ backgroundImage: "url('/images/backgroundImageInLogin.png')" }}
      ></div>
  
      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col md:flex-row h-full w-full">
        {/* Left Side - Login Form */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 px-8 md:px-16 bg-opacity-90 h-full">
          <div className="max-w-md w-full">
            <h1 className="text-3xl font-bold mb-2">Welcome to EMA</h1>
            <p className="text-sm text-gray-600 mb-6">Please login to use the platform</p>
  
            <form onSubmit={handleLogin}>
              <div className="relative mb-4">
                <input
                  type="email"
                  placeholder="Enter E-mail"
                  required
                  className="w-full h-12 border border-gray-300 rounded-full px-4 pr-10 outline-none focus:border-blue-500"
                />
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                />
              </div>
  
              <div className="relative mb-4">
                <input
                  type="password"
                  placeholder="Enter Password"
                  required
                  className="w-full h-12 border border-gray-300 rounded-full px-4 pr-10 outline-none focus:border-blue-500"
                />
                <FontAwesomeIcon
                  icon={faKey}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                />
              </div>
  
              <button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-700 to-yellow-500 text-white font-semibold rounded-full hover:brightness-110 transition mb-4"
              >
                SIGN IN
              </button>
  
              <span>
                Don't have an account?{" "}
                <Link to="/signup" className="text-blue-500 underline hover:text-blue-400">
                  Sign Up
                </Link>
              </span>
  
              {verificationRequired ? (
                <p className="text-yellow-600">Email not verified. Please check your email.</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : null}
            </form>
          </div>
        </div>
  
        {/* Right Side - Illustration */}
        <div className="hidden md:flex justify-center items-center w-full md:w-1/2 bg-opacity-90">
          <img
            src="/images/peopleImageInLogin.png"
            alt="Login Illustration"
            className="w-[500px] h-[500px] object-contain"
          />
        </div>
      </div>
    </div>
  );
  
}
