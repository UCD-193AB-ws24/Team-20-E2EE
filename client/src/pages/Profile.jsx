import React, { useState } from 'react';
import { logoutUser } from '../api/auth';

export default function Profile({ onClose }) {
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) {
      console.log("Logout successful");
      window.location.href = "/login";
    } else {
      console.error("Logout failed:", response.error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-70">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full"
        >
          &times;
        </button>
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gray-300 mb-4 flex items-center justify-center overflow-hidden">
            <img src="https://via.placeholder.com/150" alt="Avatar" className="object-cover"/>
          </div>
          <h1 className="text-3xl font-bold text-blue-500">Profile Page</h1>
          <p className="text-lg text-gray-600 mt-4">Your profile details go here...</p>
          <div className="mt-4">
            <button
              onClick={() => setShowLogoutConfirmation(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-300"
            >
              Logout
            </button>
          </div>
        </div>
        {showLogoutConfirmation && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Logout</h2>
              <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowLogoutConfirmation(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}