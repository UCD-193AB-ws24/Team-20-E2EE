import React, {useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdMessage, MdPeople, MdPersonAdd, MdArchive, MdPerson } from 'react-icons/md';
import { registerFriendRequestListener, registerFriendRequestHandledListener } from '../api/socket';
import { getFriendRequests } from '../api/friends';
import { useSocket } from './index';

export default function NavBar({ onProfileClick, setView }) {
  const location = useLocation();
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const { socketReady } = useSocket();

  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.idToken;
  };

  // Set up friend request and friend request handled listener
  useEffect(() => {
    if (!socketReady) {
      console.log('Socket not ready, waiting to set up listener');
      return;
    }

    const unsubscribeFriendRequest = registerFriendRequestListener((data) => {
      console.log('Friend request received:', data);
      setFriendRequestsCount((prevCount) => prevCount + 1);
    });

    console.log('Setting up friend request handled listener');
    const unsubscribeFriendRequestCount = registerFriendRequestHandledListener(() => {
      console.log('Friend request handled received');
      setFriendRequestsCount((prevCount) => prevCount - 1);
    });
    
    return () => {
      if (unsubscribeFriendRequestCount) unsubscribeFriendRequestCount();
      if (unsubscribeFriendRequest) unsubscribeFriendRequest();
    };
  }, [socketReady]);

  // Fetch friend requests count on mount
  useEffect(() => {
    const loadFriendRequestsCount = async () => {
      try {
        const token = getToken();
        const data = await getFriendRequests(token);
        console.log('Friend requests data:', data);
        setFriendRequestsCount(data.friendRequests.length || 0 );
      } catch (err) {
        console.error('Failed to load friend requests');
      }
    }
    console.log('Loading friend requests count ', friendRequestsCount);

    loadFriendRequestsCount();
  }, []);

  return (
    <div className="w-[250px] flex flex-col justify-between h-screen bg-ucd-blue-light">
      <div className="flex flex-col items-start mt-3 ml-3">
        {/* Direct Messages Link */}
        <Link
          to="/"
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition flex items-center text-lg ${
            location.pathname === '/' ? 'text-ucd-blue-800 bg-ucd-blue-100' : 'text-ucd-blue-600'
          } hover:text-ucd-blue-800 hover:bg-ucd-blue-100 hover:scale-105`}
          onClick={() => setView('chat')}
        >
          <MdMessage className={`mr-3 ${location.pathname === '/' ? 'text-ucd-blue-800' : 'text-ucd-blue-600'}`} />
          <span className="pt-1 align-middle">Chat</span>
        </Link>

        {/* Friends Link */}
        <Link
          to="/friends"
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition flex items-center text-lg ${
            location.pathname === '/friends' ? 'text-ucd-blue-800 bg-ucd-blue-100' : 'text-ucd-blue-600'
          } hover:text-ucd-blue-800 hover:bg-ucd-blue-100 hover:scale-105`}
          onClick={() => setView('friends')}
        >
          <MdPeople className={`mr-3 ${location.pathname === '/friends' ? 'text-ucd-blue-800' : 'text-ucd-blue-600'}`} />
          <span className="pt-1 align-middle">Friends</span>
        </Link>

        {/* Requests Link */}
        <Link
          to="/requests"
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition flex items-center text-lg ${
            location.pathname === '/requests' ? 'text-ucd-blue-800 bg-ucd-blue-100' : 'text-ucd-blue-600'
          } hover:text-ucd-blue-800 hover:bg-ucd-blue-100 hover:scale-105`}
          onClick={() => setView('requests')}
        >
          {friendRequestsCount > 0 ? (
            <span className="relative text-xs text-white bg-red-600 w-6 h-6 flex items-center justify-center rounded-full mr-2">
              {friendRequestsCount}
            </span>
          ) : (
            <MdPersonAdd className={`mr-3 ${location.pathname === '/requests' ? 'text-ucd-blue-800' : 'text-ucd-blue-600'}`} />
          )}
          <span className="pt-1 align-middle">Requests</span>
        </Link>

        {/* Archive Link */}
        <Link
          to="/archive"
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition flex items-center text-lg ${
            location.pathname === '/archive' ? 'text-ucd-blue-800 bg-ucd-blue-100' : 'text-ucd-blue-600'
          } hover:text-ucd-blue-800 hover:bg-ucd-blue-100 hover:scale-105`}
          onClick={() => setView('archive')}
        >
          <MdArchive className={`mr-3 ${location.pathname === '/archive' ? 'text-ucd-blue-800' : 'text-ucd-blue-600'}`} />
          <span className="pt-1 align-middle">Archive</span>
        </Link>
      </div>

      <div className="flex flex-col items-start p-4 mb-4">
        {/* Profile Link */}
        <button
          onClick={onProfileClick}
          className="w-full text-left px-4 py-3 rounded-lg transition flex items-center text-lg text-ucd-blue-600 hover:text-ucd-blue-800 hover:bg-ucd-blue-100 hover:scale-105"
        >
          <MdPerson className="mr-3 text-ucd-blue-600" />
          <span className="pt-1">Profile</span>
        </button>
      </div>
    </div>
  );
}