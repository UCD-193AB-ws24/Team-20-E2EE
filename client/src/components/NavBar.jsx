import React, {useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdMessage, MdPeople, MdPersonAdd, MdArchive, MdPerson } from 'react-icons/md';
import { TbLayoutSidebarLeftExpandFilled, TbLayoutSidebarRightExpand } from "react-icons/tb";
import { registerFriendRequestListener, registerFriendRequestHandledListener } from '../api/socket';
import { getFriendRequests } from '../api/friends';
import { useSocket, useAppContext } from './index';
import { motion } from "motion/react";

export default function NavBar({ onProfileClick, setView }) {
  const location = useLocation();
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const { socketReady } = useSocket();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useAppContext();

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

  // Theme Styling
  const navBarStyle = {
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.primary,
  };

  const activeItemStyle = {
    backgroundColor: theme.colors.background.accent,
  }

  const notificationStyle = {
    color: theme.colors.notification.text,
    backgroundColor: theme.colors.notification.background,
  }

  return (
    <motion.div 
    initial={{ width: 150 }}
    animate={{ width: isCollapsed ? 60 : 150 }}
    transition={{ duration: 0.2, ease: "easeOut"}}
    >
      <div
       className={`flex flex-col justify-between h-screen ${isCollapsed ? 'w-[60px]' : 'w-[150px]'}`}
       style={navBarStyle}
       >
        <div className="flex flex-col items-start mt-3 ml-[10px]">
          {/* Direct Messages Link */}
          <Link
            to="/"
            className={`w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] hover:scale-105`}
            style={location.pathname === '/' ? activeItemStyle : {}}
            onClick={() => setView('chat')}
          >
            <MdMessage/>
            {!isCollapsed && <span className="text-lg align-middle pl-[15px]">Chat</span>}
          </Link>

          {/* Friends Link */}
          <Link
            to="/friends"
            className={`w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] hover:scale-105`}
            style={location.pathname === '/friends' ? activeItemStyle : {}}
            onClick={() => setView('friends')}
          >
            <MdPeople/>
            {!isCollapsed && <span className="text-lg align-middle pl-[15px]">Friends</span>}
          </Link>

          {/* Requests Link */}
          <Link
            to="/requests"
            className={`w-full flex text-left px-[15px] rounded-lg mb-2 transition items-center text-lg h-[50px] hover:scale-105`}
            style={location.pathname === '/requests' ? activeItemStyle : {}}
            onClick={() => setView('requests')}
          >
            <div className='relative w-[20px] h-[20px]'>
              {friendRequestsCount > 0 ? (
                <span 
                  className="relative text-xs w-[20px] h-[20px] flex items-center justify-center rounded-full mr-2"
                  style={notificationStyle}
                >
                  {friendRequestsCount}
                </span>
              ) : (
                <MdPersonAdd/>
              )}
            </div>
            {!isCollapsed && <span className="text-lg align-middle pl-[15px]">Requests</span>}
          </Link>

          {/* Archive Link */}
          <Link
            to="/archive"
            className={`w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] hover:scale-105`}
            style={location.pathname === '/archive' ? activeItemStyle : {}}
            onClick={() => setView('archive')}
          >
            <MdArchive/>
            {!isCollapsed && <span className="text-lg align-middle pl-[15px]">Archive</span>}
          </Link>
        </div>

        <div className={`flex flex-col items-start mt-[10px] ml-[10px] ${isCollapsed ? 'w-[60px]' : 'w-[150px]'}`}>
          {/* Profile Link */}
          <button
            onClick={onProfileClick}
            className="w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] text-ucd-blue-600 hover:scale-105"
          >
            <MdPerson className="mr-3 text-ucd-blue-600" />
            {!isCollapsed && <span className="text-lg align-middle pl-[15px]">Profile</span>}
          </button>

          {/* Collasp Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] text-ucd-blue-600 hover:scale-105"
            >
              {isCollapsed ? (
                <TbLayoutSidebarLeftExpandFilled/>
              ) : (
                <TbLayoutSidebarRightExpand/>
              )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}