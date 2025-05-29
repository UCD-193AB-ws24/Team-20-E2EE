import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    const result = await login(email, password);

    if (result.success) {
      navigate("/");
    } else if (
      result.error === "Email not verified. Please check your email."
    ) {
      setVerificationRequired(true);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-8 md:px-12 ml-[20px] md:ml-[40px] lg:ml-[80px]">
        <a href="/" className="inline-block">
          <img
            src="/images/ema-logo.png"
            alt="ema-logo"
            className="w-16 md:w-20 h-auto object-contain"
          />
        </a>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-20 px-6 md:px-12 lg:px-32 py-10 flex-1">
        <div className="w-full md:w-1/2 mt-10 md:mt-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0d47a1] leading-tight">
            Connect Securely,
            <br />
            Chat Confidently
          </h1>
          <p className="text-[#65686c] mt-6 text-base md:text-lg">
            End-to-end encryption for every message,
            <br />
            because your words deserve total protection.
          </p>

          {!verificationRequired ? (
            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full max-w-md bg-[#f5f5f5] text-[#242424] px-4 py-3 rounded-lg border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
              />
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full max-w-md bg-[#f5f5f5] text-[#242424] px-4 py-3 rounded-lg border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
                <button
                  type="submit"
                  className="w-full max-w-md sm:w-auto px-6 py-2 bg-[#0d47a1] text-white rounded-lg text-base font-medium hover:bg-[#1565c0] transition"
                >
                  Log In
                </button>
                <Link
                  to="/forgot"
                  className="text-[#0A7CFF] text-sm hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <div className="mt-4 text-left max-w-md">
                <span className="text-gray-600">Don't have an account? </span>
                <Link to="/signup" className="text-[#0d47a1] hover:underline">
                  Sign Up
                </Link>
              </div>

              {/* Divider */}
              <div className="flex items-center mt-6 max-w-md">
                <hr className="flex-grow border-t border-gray-400" />
                <span className="mx-4 text-gray-500">OR</span>
                <hr className="flex-grow border-t border-gray-400" />
              </div>

              {/* Passkey login button */}
              <div className="mt-4">
                <button
                  onClick={() => navigate("/passkey")}
                  className="w-full max-w-md px-6 py-2 bg-[#0d47a1] text-white rounded-lg font-medium hover:bg-[#1565c0] transition"
                >
                  Use Passkey
                </button>
              </div>

              {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>
          ) : (
            <p className="text-yellow-500 mt-4">
              Email not verified. Please check your email.
            </p>
          )}
        </div>
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
