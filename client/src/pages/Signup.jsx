import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
    const confirmPassword = e.target[2].value;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await signUpUser(email, password);
    if (result.success) {
      setVerificationRequired(true);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      {/* Left Side - Sign Up Form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 px-8 md:px-16 bg-white h-screen">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
          <p className="text-sm text-gray-600 mb-6">Please sign up to access the platform</p>

          {verificationRequired ? (
            <EmailVerificationMessage />
          ) : (
            <form onSubmit={handleSignUp}>
              {/* Email Input */}
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

              {/* Password Input */}
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

              {/* Confirm Password Input */}
              <div className="relative mb-4">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  className="w-full h-12 border border-gray-300 rounded-full px-4 pr-10 outline-none focus:border-blue-500"
                />
                <FontAwesomeIcon
                  icon={faKey}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                />
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-700 to-yellow-500 text-white font-semibold rounded-full hover:brightness-110 transition mb-4"

              >
                SIGN UP
              </button>

              <span>
                Already have an account?{" "}
                <Link to="/login" className="text-blue-500 underline hover:text-blue-400">
                  Login
                </Link>
              </span>

              {/* Error Message */}
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>
          )}
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden md:flex justify-center items-center w-full md:w-1/2 bg-white">
        <img
          src="/images/imageInLogin.png"
          alt="Sign Up Illustration"
          className="w-[500px] h-auto"
        />
      </div>
    </div>
  );
}
