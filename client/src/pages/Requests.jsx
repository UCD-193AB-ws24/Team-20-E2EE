import React, { useState, useEffect } from "react";
import { MdPersonAdd, MdClose } from "react-icons/md";
import {
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
} from "../api/friends";
import { registerFriendRequestListener } from "../api/socket";
import { useSocket, useAppContext } from "../components";
import { getAvatar } from "../api/user";
import { motion } from "motion/react";
import { BACKEND_URL } from "../config/config";
import fetchWithAuth from "../util/FetchWithAuth";
import { fetchKeyBundle } from '../api/keyBundle';
import { showToast } from "../components";

export default function Requests() {
  const [friendRequests, setFriendRequests] = useState([]);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { socketReady } = useSocket();
  const { theme } = useAppContext();
  const [matchedUsers, setMatchedUsers] = useState([]);

  useEffect(() => {
    if (!socketReady) return;

    const unsubscribeFriendRequest = registerFriendRequestListener(() => {
      loadFriendRequests();
    });

    return () => {
      if (unsubscribeFriendRequest) unsubscribeFriendRequest();
    };
  }, [socketReady]);

  const loadFriendRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFriendRequests();
      const requests = data.friendRequests || [];

      const requestsWithAvatars = await Promise.all(
        requests.map(async (request) => {
          try {
            const avatar = await getAvatar(request.username);
            return { ...request, avatar };
          } catch (err) {
            return request;
          }
        })
      );

      setFriendRequests(requestsWithAvatars);
    } catch (err) {
      setError(err.message || "Failed to load friend requests");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFriendRequests();
  }, []);

  const handleAcceptRequest = async (username) => {
    try {
      await acceptFriendRequest(username);
      setFriendRequests(friendRequests.filter((request) => request.username !== username));
      
      // Fetch the new friend's key bundle for future encrypted messaging
      try {
        console.log(`Fetching key bundle for new friend: ${username}`);
        const keyBundleResult = await fetchKeyBundle(username);
        if (keyBundleResult.success) {
          console.log(`Successfully fetched key bundle for ${username}`);
        } else {
          console.warn(`Failed to fetch key bundle for ${username}:`, keyBundleResult.error);
        }
      } catch (keyBundleError) {
        console.error(`Error fetching key bundle for ${username}:`, keyBundleError);
        // Don't fail the friend acceptance, just log the warning
      }
      
      showToast(`Friend request from ${username} accepted`, "success");
    } catch (err) {
      showToast(err.message || "Failed to accept friend request", "error");
    }
  };

  const handleDeclineRequest = async (username) => {
    try {
      await deleteFriendRequest(username);
      setFriendRequests(friendRequests.filter((request) => request.username !== username));
      showToast(`Friend request from ${username} declined`, "info");
    } catch (err) {
      showToast(err.message || "Failed to decline friend request", "error");
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setSendStatus({ success: false, message: "Please enter a username" });
      return;
    }

    setIsLoading(true);
    setSendStatus(null);

    try {
      const result = await sendFriendRequest(username);

      setSendStatus({
        success: true,
        message: result.message || `Friend request sent to ${username}`,
      });

      setUsername("");

      setTimeout(() => {
        setShowModal(false);
        setSendStatus(null);
      }, 1500);
    } catch (err) {
      setSendStatus({ success: false, message: err.message || "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setMatchedUsers([]);
      return;
    }

    try {
      const res = await fetchWithAuth(`${BACKEND_URL}/api/user/matchedUsers?q=${query}`);
      const data = await res.json();
      setMatchedUsers(data.users || []);
    } catch (err) {
      console.error("Search failed", err);
      setMatchedUsers([]);
    }
  };

  // Debounce searchUsers
  useEffect(() => {
    if (!username.trim()) {
      setMatchedUsers([]);
      return;
    }

    const debounceTimeout = setTimeout(() => {
      searchUsers(username);
    }, 2000);

    return () => clearTimeout(debounceTimeout);
  }, [username]);

  const AddFriendModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
        <div className="rounded-xl shadow-xl w-full max-w-md p-5" style={{ backgroundColor: theme.colors.background.secondary }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add a Friend</h2>
            <button
              onClick={() => {
                setShowModal(false);
                setUsername("");
                setSendStatus(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <MdClose size={24} />
            </button>
          </div>

          <form onSubmit={handleSendRequest} className="space-y-4">
            <input
              id="username"
              type="text"
              placeholder="Enter a username (case-sensitive)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 rounded-lg focus:outline-none"
              style={{ backgroundColor: theme.colors.background.accent }}
              autoFocus
              disabled={isLoading}
            />

            {sendStatus && (
              <div className={`p-3 rounded-md ${sendStatus.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                {sendStatus.message}
              </div>
            )}

            <div className="flex justify-end">
              <motion.button
                type="submit"
                disabled={isLoading || !username.trim()}
                style={{
                  backgroundColor: isLoading || !username.trim() ? "#9CA3AF" : theme.colors.button.secondary,
                  color: theme.colors.text.secondary,
                  cursor: isLoading || !username.trim() ? "not-allowed" : "pointer",
                }}
                whileHover={!(isLoading || !username.trim()) && { backgroundColor: theme.colors.button.secondaryHover }}
                className="px-4 py-2 rounded-lg flex items-center"
                transition={{ duration: 0.1 }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <MdPersonAdd className="mr-2" />
                    Send Request
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {matchedUsers.length > 0 && (
            <ul className="rounded shadow max-h-40 overflow-y-auto mt-1 z-50 relative border border-gray-300"
            style={{ background: theme.colors.background.primary,
                color: theme.colors.text}}  >
              {matchedUsers.map((user) => (
                <li
                  key={user.uid}
                  onClick={() => {
                    setUsername(user.username);
                  }}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  
                >
                  {user.username}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col shadow-lg rounded-lg p-1 overflow-hidden" style={{ backgroundColor: theme.colors.background.secondary }}>
      <div className="p-3">
        <h2 className="text-2xl font-bold mb-3">Requests</h2>
        <motion.button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg flex items-center w-fit mb-1"
          style={{ backgroundColor: theme.colors.button.primary, color: theme.colors.text.secondary }}
          whileHover={{ backgroundColor: theme.colors.button.primaryHover }}
          transition={{ duration: 0.1 }}
        >
          <MdPersonAdd className="mr-2" />
          Add a User
        </motion.button>
      </div>

      {error && <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {isLoading && !showModal ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-1">
          {friendRequests.length === 0 ? (
            <p className="p-4 text-gray-500">No friend requests</p>
          ) : (
            friendRequests.map((request, index) => (
              <li
                key={index}
                className={`flex flex-col items-center justify-between p-4 shadow-md ${index === 0 ? "border-t border-b" : "border-b"}`}
                style={{ borderColor: theme.colors.background.accent }}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full text-white flex items-center justify-center mr-4 overflow-hidden">
                    <img
                      src={request.avatar || "https://via.placeholder.com/40"}
                      alt={request.username.charAt(0).toUpperCase()}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-medium">{request.username}</span>
                </div>
                <div className="flex mt-2 space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request.username)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request.username)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      <AddFriendModal />
    </div>
  );
}
