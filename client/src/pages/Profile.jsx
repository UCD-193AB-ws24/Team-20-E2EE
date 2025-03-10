import React, { useEffect, useState } from 'react';
import { logoutUser } from '../api/auth';
import { BACKEND_URL } from '../config/config';

export default function Profile({ onClose }) {
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Fetch user info
    const fetchUserInfo = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = user?.idToken;
      const response = await fetch(`${BACKEND_URL}/api/user/get-user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (token) {
        console.log("Token found:", token);
      } else {
        console.log("No token found.");
      }

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
        
        if (data.user.avatar) {
          setAvatarUrl(`/api/user/get-avatar/${data.user.avatar}`);
        }

        // Set the description (if available)
        if (data.user.description) {
          setDescription(data.user.description);
        }
      } else {
        console.error("Request failed with status:", response.status);
        const errorText = await response.text(); // Read error response
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) {
      console.log("Logout successful");
      window.location.href = "/login";
    } else {
      console.error("Logout failed:", response.error);
    }
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value); // Update description as user types
  };

  const handleSaveDescription = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = user?.idToken;

    const response = await fetch(`${BACKEND_URL}/api/user/update-description`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ description }),
    });

    if (response.ok) {
      const data = await response.json();
      setUserInfo(data.user);
      setIsEditing(false);
    } else {
      console.error("Failed to save description:", response.status);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 p-2 bg-gray-200 rounded-full"
        >
          &times;
        </button>
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gray-300 mb-4 flex items-center justify-center">
            {/* Display avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar"/>
            ) : (
              <img src="https://via.placeholder.com/150" alt="Avatar" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-blue-500">
            {userInfo ? `${userInfo.username}'s Profile` : "Profile"}
          </h1>
          <div className="mt-4">
            {isEditing ? (
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                value={description}
                onChange={handleDescriptionChange}
                rows="4"
              />
            ) : (
              <p className="text-lg text-gray-600 mt-4">{description || "Your profile description goes here..."}</p>
            )}
          </div>
          <div className="mt-4">
            {isEditing ? (
              <button
                onClick={handleSaveDescription}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-300"
              >
                Save Description
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)} // Enable editing
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-300"
              >
                Edit Description
              </button>
            )}
          </div>
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
