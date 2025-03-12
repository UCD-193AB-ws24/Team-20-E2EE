import React from 'react';
import Sidebar from '../components/NavBar';
import { logoutUser
 } from '../api/auth';
import { useCorbado} from "@corbado/react";

import { PasskeyList } from "@corbado/react";

export default function Profile() {
  const { logout, isAuthenticated, user } = useCorbado();
  
  // Retrieve login method and stored email (if available)
  const authMethod = localStorage.getItem("authMethod");
  const storedEmail = localStorage.getItem("userEmail");

  const handleLogout = async () => {
    localStorage.removeItem("authMethod");
    localStorage.removeItem("userEmail");

    const response = await logoutUser();
    if (response.success) {
      console.log("Logout successful");
      window.location.href = "/login";
    } else {
      console.error("Logout failed:", response.error);
    }
  };

  if (authMethod === "traditional" && storedEmail) {
    return (
      <div className="h-screen flex">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-blue-500">Profile Page</h1>
          <p className="text-lg text-gray-600 mt-4">
            User-ID: Not Available
            <br/>
            Email: {storedEmail}
          </p>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-300">
            Logout
          </button>
        </div>
      </div>
    );
  } else if (isAuthenticated && user) {
    return (
      <div className="h-screen flex">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-blue-500">Profile Page</h1>
          <p className="text-lg text-gray-600 mt-4">
            User-ID: {user.sub}
            <br/>
            Email: {user.email}
          </p>
          <div className="passkeyinfo">
            <h1>Manage your passkeys</h1>
            <PasskeyList />
          </div>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-300">
            Logout
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div>
        <p>You're not logged in.</p>
        <p>
          Please go back to{" "}
          <a href='/' onClick={handleLogout}>
            home
          </a>{" "}
          to log in.
        </p>
      </div>
    );
  }
}
