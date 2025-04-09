import React, { useEffect, useState } from 'react';
import { logoutUser } from '../api/auth';
import { BACKEND_URL } from '../config/config';
import { useCorbado } from "@corbado/react";
import { PasskeyList } from "@corbado/react";
import { useDispatch } from 'react-redux';
import { clearCredentials } from '../state/slices/authSlice';

export default function Profile({ onClose }) {
  const { logout, isAuthenticated, user } = useCorbado();
  const dispatch = useDispatch();
  const [userInfo, setUserInfo] = useState(null);
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
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

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);

        if (data.user.avatar) {
          setAvatar(`${BACKEND_URL}/api/user/get-avatar/${data.user.username}`);
        }
        if (data.user.description) {
          setDescription(data.user.description);
        }
      } else {
        console.error("Request failed with status:", response.status);
      }
    };
    fetchUserInfo();
  }, []);

  const authMethod = localStorage.getItem("authMethod");

  const handleNormalLogout = async () => {
    localStorage.clear();
    const response = await logoutUser();
    if (response.success) {
      dispatch(clearCredentials());
      window.location.href = "/login";
    } else {
      console.error("Logout failed:", response.error);
    }
  };

  const handleCorbadoLogout = async () => {
    localStorage.clear();
    const response = await logout();
    if (response.success) {
      console.log("Logout successful");
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
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("avatar", file);

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
        setAvatar(`${BACKEND_URL}/api/user/get-avatar/${userInfo.username}`);
      } else {
        console.error("Error uploading avatar:", await response.json());
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
  };

  // Conditional rendering based on auth method
  if (authMethod === "traditional") {
    return (
      <div className="h-screen flex">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-blue-500">Profile Page</h1>
          <p className="text-lg text-gray-600 mt-4">
            User-ID: Not Available
            <br />
            {/* Email: You can get from Redux here */}
          </p>
          <button
            onClick={handleNormalLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-300"
          >
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
            <br />
            Email: {user.email}
          </p>
          <div className="passkeyinfo mt-4">
            <h2 className="text-xl font-semibold mb-2">Manage your passkeys</h2>
            <PasskeyList />
          </div>
          <button
            onClick={handleCorbadoLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 mt-6 rounded-lg text-lg shadow-md transition duration-300"
          >
            Logout
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">You're not logged in.</p>
          <p className="mt-2">
            Please go back to{' '}
            <a href='/' className="text-blue-500 underline">
              home
            </a>{' '}
            to log in.
          </p>
        </div>
      </div>
    );
  }
}
