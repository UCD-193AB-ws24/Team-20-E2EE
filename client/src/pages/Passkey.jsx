import React, { useState, useEffect } from "react";
import { CorbadoAuth } from "@corbado/react";
import { BACKEND_URL } from "../config/config";
import { useNavigate } from "react-router-dom";
import { generateSignalProtocolKeys, createKeyBundle, getKeys } from "../util/encryption";
import { uploadKeyBundle, checkKeyBundle } from "../api/keyBundle";
import { getDeviceId } from "../util/deviceId";

const Passkey = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);

  const getEmailFromLocalStorage = () => {
    return new Promise((resolve) => {
      const user = localStorage.getItem("cbo_last_identifier");
      const email = user ? JSON.parse(user).value : null;
      resolve(email);
    });
  };

  useEffect(() => {
    const handlePostAuth = async () => {
      if (!authCompleted) return;
      setIsLoading(true);
      setError("");

      try {
        const email = await getEmailFromLocalStorage();
        if (!email) throw new Error("Email not found. Please try logging in again.");

        const response = await fetch(`${BACKEND_URL}/api/auth/corbado-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, deviceId: getDeviceId() }),
          credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Login failed");

        localStorage.setItem("user", JSON.stringify(data.user));

        const setupEncryptionKeys = async () => {
          const deviceStatus = await checkKeyBundle();
          if (deviceStatus.needsKeyBundle || data.user.needsKeyBundle) {
            const keys = await generateSignalProtocolKeys(data.user.uid);
            const keyBundle = createKeyBundle(keys);
            const result = await uploadKeyBundle(keyBundle);
            if (!result.success) throw new Error("Failed to upload encryption keys");

            const user = JSON.parse(localStorage.getItem("user"));
            if (user) {
              user.needsKeyBundle = false;
              localStorage.setItem("user", JSON.stringify(user));
            }
          }

          const existingKeys = await getKeys(data.user.uid);
          if (!existingKeys) await generateSignalProtocolKeys(data.user.uid);
        };

        await setupEncryptionKeys();
        navigate("/");
        window.location.reload();
      } catch (err) {
        console.error("Login error:", err);
        setError(err.message || "An error occurred during login.");
        setAuthCompleted(false);
      } finally {
        setIsLoading(false);
      }
    };

    handlePostAuth();
  }, [authCompleted, navigate]);

  const handleLogin = () => setAuthCompleted(true);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Logo Header */}
      <div className="px-6 pt-8 md:px-12 ml-[20px] md:ml-[40px] lg:ml-[80px]">
        <a href="/" className="block">
          <img src="/images/ema-logo.png" alt="ema-logo" className="w-16 md:w-20 h-auto object-contain" />
        </a>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-20 px-6 md:px-12 lg:px-32 py-10 flex-1">
        <div className="w-full md:w-1/2 mt-10 md:mt-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0d47a1] leading-tight">
            Passkey Login,<br />Secure and Fast
          </h1>
          <p className="text-[#65686c] mt-6 text-base md:text-lg">
          Log in faster and safer with passkeys — no passwords, just secure access.
          </p>
          <div className="mt-6 w-full max-w-md">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0d47a1]"></div>
                <span className="ml-2">Logging you in...</span>
              </div>
            ) : (
              <div className="p-6 rounded-lg">
                <CorbadoAuth
                  onLoggedIn={handleLogin}
                  onError={(error) => {
                    console.error("Corbado error:", error);
                    setError("Authentication failed. Please try again.");
                    setAuthCompleted(false);
                  }}
                />
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center mt-6">
              <hr className="flex-grow border-t border-gray-400" />
              <span className="mx-4 text-gray-500">OR</span>
              <hr className="flex-grow border-t border-gray-400" />
            </div>

            {/* Normal login button */}
            <div className="mt-4">
              <button
                onClick={() => navigate("/login")}
                className="w-full px-6 py-2 bg-[#0d47a1] text-white rounded-lg font-medium hover:bg-[#1565c0] transition"
                disabled={isLoading}
              >
                Use Email & Password
              </button>
            </div>
          </div>
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
};

export default Passkey;
