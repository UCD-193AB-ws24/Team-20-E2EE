import React, { useState, useEffect } from "react";
import { CorbadoAuth, useCorbado } from "@corbado/react";
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
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const { user, isAuthenticated, isLoading: isCorbadoLoading } = useCorbado();
  // Add WebAuthn compatibility check
  useEffect(() => {
    const checkWebAuthnSupport = async () => {
      try {
        if (window.PublicKeyCredential && PublicKeyCredential.isConditionalMediationAvailable) {
          const isCMA = await PublicKeyCredential.isConditionalMediationAvailable();
          setIsWebAuthnSupported(isCMA);
          console.log("WebAuthn Conditional Mediation Available:", isCMA);
        } else {
          console.log("WebAuthn not supported in this browser");
          setIsWebAuthnSupported(false);
        }
      } catch (err) {
        console.error("Error checking WebAuthn support:", err);
        setIsWebAuthnSupported(false);
      }
    };
    checkWebAuthnSupport();
  }, []);
  // Check for existing authentication
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      console.log("User already authenticated with email:", user.email);
      handlePostAuth(user.email);
    }
  }, [isAuthenticated, user]);
  const getEmailFromLocalStorage = () => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds total (100 * 100ms)
      const checkEmail = () => {
        attempts++;
        try {
          // Log all Corbado-related localStorage items
          const allStorage = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cbo_')) {
              allStorage[key] = localStorage.getItem(key);
            }
          }
          console.log("Corbado storage check attempt", attempts, ":", allStorage);
          // Check for email in user object first
          if (user?.email) {
            console.log("Found email from Corbado user object:", user.email);
            resolve(user.email);
            return;
          }
          // Check for email in session
          const session = localStorage.getItem("cbo_session");
          if (session) {
            try {
              const parsedSession = JSON.parse(session);
              console.log("Parsed session data:", parsedSession);
              if (parsedSession.user?.email) {
                console.log("Found email from Corbado session:", parsedSession.user.email);
                resolve(parsedSession.user.email);
                return;
              }
            } catch (e) {
              console.error("Error parsing Corbado session:", e, "Raw data:", session);
            }
          }
          // Check for email in client handle
          const clientHandle = localStorage.getItem("cbo_client_handle-pro-4428496853200013028");
          if (clientHandle) {
            try {
              const parsedHandle = JSON.parse(clientHandle);
              console.log("Parsed client handle:", parsedHandle);
              if (parsedHandle.email) {
                console.log("Found email from client handle:", parsedHandle.email);
                resolve(parsedHandle.email);
                return;
              }
            } catch (e) {
              console.error("Error parsing client handle:", e, "Raw data:", clientHandle);
            }
          }
        } catch (e) {
          console.error("Error checking for email:", e);
        }
        if (attempts >= maxAttempts) {
          console.error("Timeout waiting for email from Corbado. Attempts:", attempts);
          console.log("Final localStorage state:", {
            cbo_refresh_token: localStorage.getItem("cbo_refresh_token"),
            cbo_client_handle: localStorage.getItem("cbo_client_handle-pro-4428496853200013028"),
            cbo_session: localStorage.getItem("cbo_session")
          });
          reject(new Error("Timeout waiting for email from Corbado"));
          return;
        }
        setTimeout(checkEmail, 100);
      };
      checkEmail();
    });
  };
  const handleLogin = () => {
    console.log("Corbado login completed, starting post-auth process...");
    setAuthCompleted(true);
  };
  const handlePostAuth = async (emailFromUser = null) => {
    setIsLoading(true);
    setError("");
    try {
      console.log("Starting post-auth process...");
      const email = emailFromUser || await getEmailFromLocalStorage();
      if (!email) {
        console.error("No email found in localStorage");
        throw new Error("Email not found. Please try logging in again.");
      }
      console.log("Making login request with email:", email);
      const response = await fetch(`${BACKEND_URL}/api/auth/corbado-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, deviceId: getDeviceId() }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      console.log("Login successful, setting up user data...");
      localStorage.setItem("user", JSON.stringify(data.user));
      try {
        const setupEncryptionKeys = async () => {
          console.log("Setting up encryption keys...");
          const deviceStatus = await checkKeyBundle();
          if (deviceStatus.needsKeyBundle || data.user.needsKeyBundle) {
            console.log("Generating new key bundle...");
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
      } catch (keyError) {
        console.error("Error setting up encryption keys:", keyError);
        // Continue with navigation even if key setup fails
      }
      if (!data.user.username) {
        console.log("New user, navigating to welcome page...");
        navigate("/welcome");
      } else {
        console.log("Existing user, navigating to home page...");
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.message === "Timeout waiting for email from Corbado") {
        setError("Authentication timed out. Please try again.");
      } else {
        setError(err.message || "An error occurred during login. Please try again.");
      }
      setAuthCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (authCompleted) {
      handlePostAuth();
    }
  }, [authCompleted]);
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0D47A1] leading-tight">
            Passkey Login,<br />Secure and Fast
          </h1>
          <p className="text-[#65686C] mt-6 text-base md:text-lg">
            Log in faster and safer with passkeys — no passwords, just secure access.
          </p>
          <div className="mt-6 w-full max-w-md">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            {!isWebAuthnSupported && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                Your browser doesn't support passkeys. Please use a modern browser or try the email & password login.
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D47A1]"></div>
                <span className="ml-2">Logging you in...</span>
              </div>
            ) : (
              <div className="p-6 rounded-lg">
                {isWebAuthnSupported ? (
                  <CorbadoAuth
                    onLoggedIn={handleLogin}
                    onError={(error) => {
                      console.error("Corbado error:", error);
                      setError("Authentication failed. Please try again.");
                      setAuthCompleted(false);
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Passkeys are not supported in your browser.</p>
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full px-6 py-2 bg-[#0D47A1] text-white rounded-lg font-medium hover:bg-[#1565C0] transition"
                    >
                      Use Email & Password Instead
                    </button>
                  </div>
                )}
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
                className="cursor-pointer w-full px-6 py-2 bg-[#0D47A1] text-white rounded-lg font-medium hover:bg-[#1565C0] transition"
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