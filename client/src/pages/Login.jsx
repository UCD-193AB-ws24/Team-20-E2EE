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
<div className="min-h-screen flex flex-col">
  <div className="p-8">
    <a href="/" className="block">
      <img src="../public/images/bark-logo.png" alt="bark-logo" className="w-[60px] h-auto object-contain scale-80" />
    </a>
  </div>

  <div className="flex flex-col md:flex-row items-start gap-[170px] px-[170px] pb-[170px] flex-1">
    <div className="flex-1 mt-5">
      <h1 className="text-[80px] font-bold text-[#0d47a1] leading-[1.1] max-w-[600px] whitespace-nowrap">
        Connect Securely,<br />Chat Confidently
      </h1>
      <p className="text-[#65686c] mt-[35px] text-[18px]">
        End-to-end encryption for every message,<br />because your words deserve total protection.
      </p>

      <div className="flex flex-col gap-[10px] mt-[35px]">
        <input
          type="email"
          placeholder="Email"
          className="max-w-[380px] w-[380px] bg-[#f5f5f5] text-[#242424] px-4 min-h-[50px] h-[50px] rounded-[10px] outline-none border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
        />
        <input
          type="password"
          placeholder="Password"
          className="max-w-[380px] w-[380px] bg-[#f5f5f5] text-[#242424] px-4 min-h-[50px] h-[50px] rounded-[10px] outline-none border border-transparent transition-all duration-200 text-base hover:border-[#0A7CFF] focus:border-[#0A7CFF]"
        />
        
        <div className="flex items-center gap-5 mt-[10px]">
          <button
            type="submit"
            className="max-w-[100px] w-[100px] px-6 py-2 bg-[#0d47a1] text-white rounded-[10px] cursor-pointer text-[18px] transition-colors duration-200 min-h-[40px] h-[40px] font-medium hover:bg-[#1565c0]"
          >
            Log In
          </button>
          <Link to="/forgot" className="text-[#0A7CFF] text-sm no-underline hover:underline transition-colors duration-200">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>

    <div className="flex justify-center flex-1 mt-[60px]">
      <img src="../public/images/chat-3d-icon.png" alt="hovering 3D chat graphic" className="w-[80%] h-auto object-contain" />
    </div>
  </div>
</div>
  );
}
