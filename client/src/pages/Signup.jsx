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
            setVerificationRequired(true); // Show email verification message
        } else {
            setError(result.error);
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
        <div className="flex flex-col gap-8 justify-center items-center h-screen bg-gray-100 w-full">
          <div className="w-[400px] text-black rounded-xl p-8 border-2 border-gray-300 shadow-lg bg-white">
            <h1 className="text-3xl font-bold text-center">Create an account</h1>
            {verificationRequired && <EmailVerificationMessage />}

            {/* Login Form */}
            {!verificationRequired && (
              <form onSubmit={handleSignUp}>
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


                {/* Confirm password field */}
                <div className="relative w-full h-12 my-6 ">
                  <input
                    type="password"
                    placeholder="Confirm Password"
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
                  Sign up
                </button>
  
                {/* Signup Link */}
                <span>
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-500 underline hover:text-blue-400">
                    Login
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

          <div className="flex items-center w-full max-w-sm">
          <hr className="flex-grow border-t border-gray-400" />
          <span className="mx-4 text-gray-500">OR</span>
          <hr className="flex-grow border-t border-gray-400" />
        </div>
        <div>
          <button className="p-4 bg-white rounded-lg text-black border-lg border-black border-2 font-bold hover:brightness-105 cursor-pointer hover:translate-y-[-5px] transition-transform shadow-lg" onClick={() => {navigate("/passkey")}}>
            Passkey Secure Login
          </button>
        </div>

        </div>
      </div>
    );
}
