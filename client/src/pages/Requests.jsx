import React, { useState, useEffect } from 'react';
import { MdPersonAdd, MdClose } from 'react-icons/md';
import { getFriendRequests, sendFriendRequest, acceptFriendRequest, deleteFriendRequest } from '../api/friends';
import { registerFriendRequestListener } from '../api/socket';
import { useSocket } from '../components';

export default function Requests() {
  const [friendRequests, setFriendRequests] = useState([]);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { socketReady } = useSocket();

  // Get the auth token from localStorage
  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.idToken;
  };

  // Set up friend request listeners
  useEffect(() => {
    if (!socketReady) {
      console.log('Socket not ready, waiting to set up listeners');
      return;
    }
    
    const unsubscribeFriendRequest = registerFriendRequestListener((data) => {
      console.log('Friend request received:', data);
      
      // Reload friend requests when a new one comes in
      const loadFriendRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const token = getToken();
          const data = await getFriendRequests(token);
          setFriendRequests(data.friendRequests || []);
        } catch (err) {
          setError(err.message || 'Failed to load friend requests');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadFriendRequests();
    });
    
    return () => {
      if (unsubscribeFriendRequest) unsubscribeFriendRequest();
    };
  }, [socketReady]);

  // Fetch friend requests on component mount
  useEffect(() => {
    const loadFriendRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = getToken();
        const data = await getFriendRequests(token);
        setFriendRequests(data.friendRequests || []);
      } catch (err) {
        setError(err.message || 'Failed to load friend requests');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriendRequests();
  }, []);

  // Handle accepting a friend request
  const handleAcceptRequest = async (username) => {
    try {
      const token = getToken();
      await acceptFriendRequest(token, username);
      // Remove from list after accepting
      setFriendRequests(friendRequests.filter(request => request.username !== username));
      alert(`Friend request from ${username} accepted`);
    } catch (err) {
      alert(err.message || 'Failed to accept friend request');
    }
  };

  // Handle declining a friend request
  const handleDeclineRequest = async (username) => {
    try {
      const token = getToken();
      await deleteFriendRequest(token, username);
      // Remove from list after declining
      setFriendRequests(friendRequests.filter(request => request.username !== username));
      alert(`Friend request from ${username} declined`);
    } catch (err) {
      alert(err.message || 'Failed to decline friend request');
    }
  };

  // Send new friend request
  const handleSendRequest = async (e) => {
    e.preventDefault();
  
    if (!username.trim()) {
      setSendStatus({
        success: false,
        message: "Please enter a username",
      });
      return;
    }
  
    setIsLoading(true);
    setSendStatus(null);
  
    try {
      // Get the auth token from localStorage
      const token = getToken();

      const result = await sendFriendRequest(token, username);
  
      setSendStatus({
        success: true,
        message: result.message || `Friend request sent to ${username}`,
      });
  
      // Clear input after sending
      setUsername("");
  
      setTimeout(() => {
        setShowModal(false);
        setSendStatus(null);
      }, 1500);
    } catch (err) {
      setSendStatus({
        success: false,
        message: err.message || "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // User search modal
  const AddFriendModal = () => {
    if (!showModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-ucd-blue-900">Add a Friend</h2>
            <button 
              onClick={() => {
                setShowModal(false);
                setUsername('');
                setSendStatus(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <MdClose size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSendRequest} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter a username (case-sensitive)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucd-gold-600"
                autoFocus
                disabled={isLoading}
              />
            </div>
            
            {sendStatus && (
              <div className={`p-3 rounded-md ${sendStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {sendStatus.message}
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className={`px-4 py-2 rounded-lg text-white flex items-center ${
                  isLoading || !username.trim() 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-ucd-blue-600 hover:bg-ucd-blue-700'
                }`}
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
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg m-3 p-3 overflow-hidden">
      {/* Header section with title on its own line */}
      <div className="p-2">
        <h2 className="text-2xl font-bold text-ucd-blue-900 mb-3">Friend Requests</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-ucd-gold-600 text-white rounded-lg hover:bg-ucd-gold-700 flex items-center w-fit"
        >
          <MdPersonAdd className="mr-2" />
          Add a User
        </button>
      </div>
      
      {error && (
        <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Friend requests list */}
      <div className="flex items-center mb-4 mt-4">
        <h3 className="px-4 text-sm font-semibold text-gray-500">Pending Requests</h3>
      </div>
      
      {isLoading && !showModal ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ucd-blue-600"></div>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {friendRequests.length === 0 ? (
            <p className="p-4 text-gray-500">No friend requests</p>
          ) : (
            friendRequests.map((request, index) => (
              <li
                key={index}
                className="flex flex-col items-center justify-between p-4 mb-2 bg-white rounded-lg shadow-md"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4">
                    {request.username.charAt(0).toUpperCase()}
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
      
      {/* Add friend modal */}
      <AddFriendModal />
    </div>
  );
}