import React, { useEffect, useState } from 'react';
import { logoutUser } from '../api/auth';
import { BACKEND_URL } from '../config/config';
import { getAvatar } from '../api/user';
import { useAppContext } from '../components';

export default function Profile({ onClose }) {
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const { theme } = useAppContext();

  useEffect(() => {
    const fetchUserInfo = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = user?.idToken;
      console.log("user: ", user.username);
      const response = await fetch(`${BACKEND_URL}/api/user/get-user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      // if (token) {
      //   console.log("Token found:", token);
      // } else {
      //   console.log("No token found.");
      // }

      if (response.ok) {
        const data = await response.json();
        console.log(data.user);
        setUserInfo(data.user);

        if (data.user.avatar) {
          const avatarUrl = await getAvatar(data.user.username);
          setAvatar(avatarUrl);
        }

        if (data.user.description) {
          setDescription(data.user.description);
        }
      } else {
        console.error("Request failed with status:", response.status);
        const errorText = await response.text();
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

  const handleImageUpload = async () => {
    console.log("here");

    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];

    const formData = new FormData();
    console.log("Form data: ", formData);

    formData.append("avatar", file);  // Append file to form data
  
    const user = JSON.parse(localStorage.getItem("user"));
    const token = user?.idToken;
  
    if (!token) {
      console.error("Token is not available");
      return;
    }
  
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/update-avatar`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
  

      if (response.ok) {
        const result = await response.json();
        console.log("AvatarUrl: ", result);
        const { avatarUrl } = result;
  
        setAvatar(`${BACKEND_URL}/api/user/get-avatar/${userInfo.username}`);
        console.log("Avatar updated successfully:", avatarUrl);
      } else {
        console.error("Error uploading avatar:", await response.json());
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}>
      <div
       className="rounded-lg p-6 w-96 shadow-lg relative"
       style={{backgroundColor: theme.colors.background.secondary}}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full"
          style={{
            backgroundColor: theme.colors.background.accent,
          }}
        >
          <span className="text-xl">&times;</span>
        </button>
        <div className="flex flex-col items-center justify-center">
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="w-32 h-32 rounded-full bg-gray-300 mb-4 flex items-center justify-center overflow-hidden">
              <img 
                src={avatar || "https://via.placeholder.com/150"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </label>
          <input id="file-input" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <h1 className="text-3xl font-bold text-blue-500">{userInfo ? `${userInfo.username}'s Profile` : "Profile"}</h1>
          <div className="mt-4">
            {isEditing ? (
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                onClick={() => setIsEditing(true)}
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
          <div className="absolute inset-0 bg-opacity-90 flex items-center justify-center z-50" style={{backgroundColor: theme.colors.background.secondary}}>
            <div className="rounded-lg p-6 w-96 shadow-lg" style={{backgroundColor: theme.colors.background.primary}}>
              <h2 className="text-2xl font-bold mb-4">Confirm Logout</h2>
              <p className="mb-6">Are you sure you want to logout?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowLogoutConfirmation(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleLogout()
                  }}
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
};