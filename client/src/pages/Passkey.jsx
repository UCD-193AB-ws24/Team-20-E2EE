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
  
  // Function to get the email from local storage
  const getEmailFromLocalStorage = () => {
    return new Promise((resolve) => {
      const user = localStorage.getItem("cbo_last_identifier");
      const email = user ? JSON.parse(user).value : null;
      resolve(email);
    });
  };

  // Effect to handle the post-authentication process
  useEffect(() => {
    const handlePostAuth = async () => {
      if (!authCompleted) return;
      
      setIsLoading(true);
      setError("");
      
      try {
        const email = await getEmailFromLocalStorage();
        
        if (!email) {
          throw new Error("Email not found. Please try logging in again.");
        }

        const response = await fetch(`${BACKEND_URL}/api/auth/corbado-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            email, 
            deviceId: getDeviceId()
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Check if key generation is needed for this device
          const setupEncryptionKeys = async () => {
            try {
              // First check if this device needs a key bundle
              const deviceStatus = await checkKeyBundle();
              
              // If server says we need a key bundle or user flag indicates need
              if (deviceStatus.needsKeyBundle || data.user.needsKeyBundle) {
                console.log('Generating new encryption keys for device');
                const keys = await generateSignalProtocolKeys(data.user.uid);
                const keyBundle = createKeyBundle(keys);
                const result = await uploadKeyBundle(keyBundle);
                
                if (result.success) {
                  console.log('Key bundle uploaded successfully from passkey login');
                  // Update user data in localStorage
                  const user = JSON.parse(localStorage.getItem("user"));
                  if (user) {
                    user.needsKeyBundle = false;
                    localStorage.setItem("user", JSON.stringify(user));
                  }
                } else {
                  console.error('Failed to upload key bundle:', result.error);
                  throw new Error('Failed to set up encryption keys');
                }
              }
              
              // Check if we have keys locally
              const existingKeys = await getKeys(data.user.uid);
              if (!existingKeys) {
                console.log('No local keys found, generating for local use only');
                // Generate keys for local use only, don't upload
                await generateSignalProtocolKeys(data.user.uid);
              } else {
                console.log('Using existing local encryption keys');
              }
            } catch (error) {
              console.error('Error setting up encryption keys:', error);
              throw new Error('Failed to set up encryption keys');
            }
          };
          
          await setupEncryptionKeys();
          
          // Navigate to home page after setting up keys
          navigate("/");
        } else {
          throw new Error(data.error || "Login failed");
        }
      } catch (err) {
        console.error("Login error:", err);
        setError(err.message || "An error occurred during login. Please try again.");
        setAuthCompleted(false);
      } finally {
        setIsLoading(false);
      }
    };

    handlePostAuth();
  }, [authCompleted, navigate]);

  const handleLogin = () => {
    setAuthCompleted(true);
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
      <div className="h-screen w-screen flex flex-col gap-8 items-center justify-center">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D4776]"></div>
            <span className="ml-2">Setting up your account...</span>
          </div>
        ) : (
          <CorbadoAuth
            onLoggedIn={handleLogin}
            onError={(error) => {
              console.error("Corbado error:", error);
              setError("Authentication failed. Please try again.");
              setAuthCompleted(false);
            }}
          />
        )}
        
        <div className="flex items-center w-full max-w-sm">
          <hr className="flex-grow border-t border-gray-400" />
          <span className="mx-4 text-gray-500">OR</span>
          <hr className="flex-grow border-t border-gray-400" />
        </div>
        <div>
          <button 
            className="p-4 bg-[#1D4776] rounded-lg text-[#FFC519] font-bold hover:brightness-105 cursor-pointer hover:translate-y-[-5px] transition-transform"
            onClick={() => { navigate("/login") }}
            disabled={isLoading}
          >
            Normal email login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Passkey;
