import React, { useEffect, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../util/getCroppedImg';
import { BACKEND_URL } from '../config/config';
import { getAvatar } from '../api/user';
import { useAppContext } from '../components';
import fetchWithAuth from '../util/FetchWithAuth';
import { useCorbado } from '@corbado/react';
import getCurrentUser from '../util/getCurrentUser.js';

export default function Profile({ onClose }) {
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [tempAvatar, setTempAvatar] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const { theme } = useAppContext();
  const { logout } = useCorbado();
  const currentUser = getCurrentUser();
  const loginMethod = currentUser?.loginMethod || null;

  useEffect(() => {
    const fetchUserInfo = async () => {
      const response = await fetchWithAuth(`${BACKEND_URL}/api/user/get-user`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
        if (data.user.avatar) {
          const avatarUrl = await getAvatar(data.user.username);
          setAvatar(avatarUrl);
        }
        if (data.user.description) {
          setDescription(data.user.description);
        }
      }
    };

    fetchUserInfo();
  }, []);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.className.includes('bg-opacity-80')) {
        onClose();
      }
    };

    // Add ESC key handler
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  const handleCorbadoLogout = async () => {
    // Save device ID before logout
    const deviceId = localStorage.getItem('e2ee-device-id');

    // Call the Corbado logout function
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      // Clear localStorage but preserve device ID
      localStorage.clear();
      if (deviceId) {
        localStorage.setItem('e2ee-device-id', deviceId);
      }

      await logout();
    } else {
      console.error("Logout failed");
    }
  };

  const handleTraditionalLogout = async () => {
    // Save device ID before logout
    const deviceId = localStorage.getItem('e2ee-device-id');

    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      // Clear localStorage but preserve device ID
      localStorage.clear();
      if (deviceId) {
        localStorage.setItem('e2ee-device-id', deviceId);
      }
    } else {
      console.error("Logout failed");
    }
  };

  const handleSaveDescription = async () => {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/user/update-description`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    if (response.ok) {
      const data = await response.json();
      setUserInfo(data.user);
      setIsEditing(false);
    }
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirmUpload = async () => {
    if (!tempAvatar || !croppedAreaPixels) return;

    const croppedBlob = await getCroppedImg(tempAvatar, croppedAreaPixels);
    const formData = new FormData();
    formData.append("avatar", croppedBlob, "avatar.jpg");

    const response = await fetchWithAuth(`${BACKEND_URL}/api/user/update-avatar`, {
      method: "PUT",
      body: formData,
    });

    if (response.ok) {
      setAvatar(`${BACKEND_URL}/api/user/get-avatar/${userInfo.username}`);
      setTempAvatar(null);
      setSelectedFile(null);
      window.location.reload();

    }
  };

  const handleLogout = async () => {
    const deviceId = localStorage.getItem('e2ee-device-id');
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      localStorage.clear();
      if (deviceId) localStorage.setItem('e2ee-device-id', deviceId);
      if (loginMethod === "corbado") await logout();
      window.location.href = "/login";
    }
  };


  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-opacity-80">
      <div className="rounded-lg p-6 w-full max-w-md shadow-lg relative" style={{ backgroundColor: theme.colors.background.secondary }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: theme.colors.background.accent }}>
          <span className="text-xl">&times;</span>
        </button>

        <div className="flex flex-col items-center">
          {tempAvatar ? (
            <div className="relative w-64 h-64 mb-4">
              <Cropper
                image={tempAvatar}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
                style={{
                  cropAreaStyle: {
                    borderRadius: '50%',
                    border: '2px solid white',
                  },
                }}
              />
            </div>
          ) : (
            <label htmlFor="file-input" className="cursor-pointer mb-4">
              <div className="w-32 h-32 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
                <img
                  src={avatar || "https://via.placeholder.com/150"}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </label>
          )}

          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setSelectedFile(file);
                setTempAvatar(URL.createObjectURL(file));
              }
            }}
          />

          {tempAvatar && (
            <div className="flex gap-3 mt-2">
              <button
                className="cursor-pointer bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4 rounded"
                onClick={handleConfirmUpload}
              >
                Confirm
              </button>
              <button
                className="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-4 rounded"
                onClick={() => {
                  setTempAvatar(null);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <h1 className="text-3xl font-bold text-blue-500 mt-4">
            {userInfo ? userInfo.username : "Profile"}
          </h1>

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
                className="text-white font-bold py-2 px-6 rounded-lg text-lg shadow-md cursor-pointer hover:translate-y-[-2px] transition-transform"
                style={{
                  backgroundColor: theme.colors.button.primary,
                  color: theme.colors.text.primary
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primary;
                }}
              >
                Save Description
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-medium font-medium py-2 px-6 rounded-lg text-lg shadow-md cursor-pointer hover:translate-y-[-2px] transition-transform"
                style={{
                  backgroundColor: theme.colors.button.primary,
                  color: theme.colors.text.primary
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primary;
                }}
              >
                Edit Description
              </button>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={() => setShowLogoutConfirmation(true)}
              className="font-medium py-2 px-6 rounded-lg text-md shadow-md cursor-pointer hover:translate-y-[-2px] transition-transform"
              style={{
                color: theme.colors.text.primary,
                backgroundColor: theme.type === 'light' ? '#E27D7D' : '#DC2626'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.type === 'light' ? '#C96B6B' : '#B91C1C';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.type === 'light' ? '#E27D7D' : '#DC2626';
              }}
            >
              Logout
            </button>

          </div>
        </div>

        {showLogoutConfirmation && (
          <div className="absolute inset-0 bg-opacity-90 flex items-center justify-center z-50" style={{ backgroundColor: theme.colors.background.secondary }}>
            <div className="rounded-lg p-6 w-96 shadow-lg" style={{ backgroundColor: theme.colors.background.primary }}>
              <h2 className="text-2xl font-bold mb-4">Confirm Logout</h2>
              <p className="mb-6">Are you sure you want to logout?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowLogoutConfirmation(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg cursor-pointer hover:translate-y-[-2px] transition-transform shadow-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
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
