import React from "react";
import { CorbadoAuth } from "@corbado/react";
import { BACKEND_URL } from "../config/config";
import { useNavigate } from "react-router-dom";
import { generateSignalProtocolKeys, createKeyBundle } from "../util/encryption";
import { uploadKeyBundle } from "../api/keyBundle";

const Passkey = () => {
  const navigate = useNavigate();
  // Function to get the email from local storage
  const getEmailFromLocalStorage = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = localStorage.getItem("cbo_last_identifier");
        const email = user ? JSON.parse(user).value : null;
        resolve(email);
      }, 2000);
    });
  };
  
  const handleLogin = async () => {
      const email = await getEmailFromLocalStorage();
      // This function will be called when the user is successfully logged in
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/corbado-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          credentials: "include", // include cookies if needed
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Check if key generation is needed
          if (data.user.needsKeyBundle) {
            await setupEncryptionKeys(data.user.uid);
          }
          
          window.location.href = "/";
        } else {
          console.error("Login failed:", data);
        }
      } catch (err) {
        console.error("Request error:", err);
      }
  };
  
  // Function to set up encryption keys
  const setupEncryptionKeys = async (userId) => {
    try {
      console.log('Generating new encryption keys');
      // Generate Signal Protocol keys for the user
      const keys = await generateSignalProtocolKeys(userId);
      
      // Create key bundle with public keys only
      const keyBundle = createKeyBundle(keys);
      
      // Upload the key bundle to the server
      const result = await uploadKeyBundle(keyBundle);
      
      if (result.success) {
        console.log('Key bundle uploaded successfully');
        // Update the user data in localStorage to reflect that key bundle is now set
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
          user.needsKeyBundle = false;
          localStorage.setItem("user", JSON.stringify(user));
        }
      } else {
        console.error('Failed to upload key bundle:', result.error);
      }
    } catch (error) {
      console.error('Error setting up encryption keys:', error);
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
      <div className="h-screen w-screen flex flex-col gap-8 items-center justify-center">
        <CorbadoAuth
          onLoggedIn={handleLogin}
          onError={(error) => console.error("Corbado error:", error)}
        />
        <div className="flex items-center w-full max-w-sm">
          <hr className="flex-grow border-t border-gray-400" />
          <span className="mx-4 text-gray-500">OR</span>
          <hr className="flex-grow border-t border-gray-400" />
        </div>
        <div>
          <button className="p-4 bg-[#1D4776] rounded-lg text-[#FFC519] font-bold hover:brightness-105 cursor-pointer hover:translate-y-[-5px] transition-transform" onClick={() => {navigate("/login")}}>
            Normal email login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Passkey;
