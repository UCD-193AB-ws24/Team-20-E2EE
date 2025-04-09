import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey } from "@fortawesome/free-solid-svg-icons";
import { loginUser } from "../api/auth";
import { useAppContext } from '../components';

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
      if (result.warning === "Please set your username to continue") {
        navigate("/welcome"); // Navigate to the welcome page if username setup is required
      } else {
        navigate("/"); // Navigate to the home page after successful login
      }
    } else if (
      result.error === "Email not verified. Please check your email."
    ) {
      setVerificationRequired(true); // Show email verification message
    } else {
      setError(result.error); // Display other errors
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full">
      <div className="pointer-event-none select-none flex flex-row md:flex-col text-[#FFC519] font-bold items-center text-2xl w-full h-[60px] md:w-[60px] md:h-screen bg-[#1D4776]">
        <p className="ml-6 md:mt-6 md:ml-0">U</p>
        <p>C</p>
        <p className="ml-2 md:mt-4 md:ml-0">D</p>
        <p>A</p>
        <p>V</p>
        <p>I</p>
        <p>S</p>
      </div>
      <div className="flex justify-center items-center h-screen bg-gray-100 w-full">
        <div className="w-[400px] text-black rounded-xl p-8 border-2 border-gray-300 shadow-lg bg-white">
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
                  className="w-full h-full bg-transparent border-2 border-gray-300 rounded-full px-6 text-lg outline-none focus:border-[#FFC519] transition"
                />
                <FontAwesomeIcon
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600"
                  icon={faUser}
                />
              </div>

              {/* Password Input */}
              <div className="relative w-full h-12 my-6 ">
                <input
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full h-full bg-transparent border-2 border-gray-300 rounded-full px-6 text-lg outline-none focus:border-[#FFC519] transition"
                />
                <FontAwesomeIcon
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600"
                  icon={faKey}
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full h-12 bg-[#1D4776] text-[#FFC519] font-bold rounded-full shadow-md mt-4 hover:translate-y-[-2px] hover:brightness-110 cursor-pointer transition my-8"
              >
                Login
              </button>

              {/* Signup Link */}
              <span>
                Don't have an account?{" "}
                <Link to="/signup" className="text-blue-500 underline hover:text-blue-400">
                  Sign Up
                </Link>
              </span>

              {/* Error Message (If Any) */}
              {verificationRequired ? (
                <p style={{ color: "yellow" }}>
                  Email not verified. Please check your email.
                </p>
              ) : error ? (
                <p style={{ color: "red" }}>{error}</p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
