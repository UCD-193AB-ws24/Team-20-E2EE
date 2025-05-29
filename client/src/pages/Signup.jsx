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
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-8 md:px-12 ml-[20px] md:ml-[40px] lg:ml-[80px]">
        <a href="/" className="block">
          <img src="/images/ema-logo.png" alt="ema-logo" className="w-16 md:w-20 h-auto object-contain" />
        </a>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-20 px-6 md:px-12 lg:px-32 py-10 flex-1">
        <div className="w-full md:w-1/2 mt-10 md:mt-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0d47a1] leading-tight">
            Join the Future,<br />Chat Securely
          </h1>
          <p className="text-[#65686c] mt-6 text-base md:text-lg">
            Create your account and enjoy end-to-end encrypted messaging<br />
            built for your privacy and peace of mind.
          </p>

          {!verificationRequired ? (
            <form onSubmit={handleSignUp} className="mt-6 flex flex-col gap-4">
              {/* Email */}
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full max-w-md bg-[#f5f5f5] text-[#242424] px-4 py-3 rounded-lg border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
              />
              {/* Password */}
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full max-w-md bg-[#f5f5f5] text-[#242424] px-4 py-3 rounded-lg border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
              />
              {/* Confirm Password */}
              <input
                type="password"
                placeholder="Confirm Password"
                required
                className="w-full max-w-md bg-[#f5f5f5] text-[#242424] px-4 py-3 rounded-lg border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
              />

              {/* Submit */}
              <button
                type="submit"
                className="cursor-pointer w-full max-w-md sm:w-auto px-6 py-2 bg-[#0d47a1] text-white rounded-lg text-base font-medium hover:bg-[#1565c0] transition mt-2"
              >
                Sign Up
              </button>

              <p className="mt-4 text-sm text-black">
                Already have an account?{" "}
                <Link to="/login" className="underline text-blue-500">
                  Login
                </Link>
              </p>

              {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>
          ) : (
            <div className="mt-6">
              <EmailVerificationMessage />
              <p className="text-yellow-500 mt-4">
                Email not verified. Please check your email.
              </p>
            </div>
          )}
        </div>

        {/* Image */}
        <div className="hidden lg:flex lg:w-1/2 justify-center mt-5">
          <img
            src="/images/chat-3d-icon.png"
            alt="hovering 3D chat graphic"
            className="w-80 h-80 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
