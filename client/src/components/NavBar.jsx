import React, {useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdMessage, MdPeople, MdPersonAdd, MdArchive, MdPerson } from 'react-icons/md';
import { FiSun, FiMoon } from "react-icons/fi";
import { TbLayoutSidebarLeftExpandFilled, TbLayoutSidebarRightExpand } from "react-icons/tb";
import { registerFriendRequestListener, registerFriendRequestHandledListener } from '../api/socket';
import { getFriendRequests } from '../api/friends';
import { useSocket, useAppContext } from './index';
import { motion, AnimatePresence } from "motion/react";
import { darkTheme, lightTheme } from '../config/themes';

export default function NavBar({ onProfileClick, setView }) {
  const location = useLocation();
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const { socketReady } = useSocket();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useAppContext();
  const isDarkMode = theme.type === 'dark';

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

  const handleThemeToggle = () => {
    setTheme(isDarkMode ? lightTheme : darkTheme);
  };

  // NavBar components
  const NavItem = ({ to, icon, label, isActive, onClick, isCollapsed, theme }) => {
    const location = useLocation();
    
    const activeItemStyle = {
      backgroundColor: theme.colors.background.accent,
    };
  
    return (
      <Link
        to={to}
        className="w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px]"
        style={isActive ? activeItemStyle : {}}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.background.accent;
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '';
          }
        }}
      >
        {icon}
        {!isCollapsed && <span className="text-lg align-middle pl-[15px]">{label}</span>}
      </Link>
    );
  };

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
          <NavItem
            to="/"
            icon={<MdMessage />}
            label="Chat"
            isActive={location.pathname === '/'}
            onClick={() => setView('chat')}
            isCollapsed={isCollapsed}
            theme={theme}
          />

          {/* Friends Link */}
          <NavItem
            to="/friends"
            icon={<MdPeople />}
            label="Friends"
            isActive={location.pathname === '/friends'}
            onClick={() => setView('friends')}
            isCollapsed={isCollapsed}
            theme={theme}
          />

          {/* Requests Link */}
          <Link
            to="/requests"
            className={`w-full flex text-left px-[15px] rounded-lg mb-2 transition items-center text-lg h-[50px]`}
            style={location.pathname === '/requests' ? activeItemStyle : {}}
            onClick={() => setView('requests')}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.background.accent;
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/requests') {
                e.currentTarget.style.backgroundColor = '';
              }
            }}
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
          <NavItem
            to="/archive"
            icon={<MdArchive />}
            label="Archive"
            isActive={location.pathname === '/archive'}
            onClick={() => setView('archive')}
            isCollapsed={isCollapsed}
            theme={theme}
          />
        </div>

        <div className={`flex flex-col items-start mt-[10px] ml-[10px]`}>
          {/* Profile Link */}
          <button
            onClick={onProfileClick}
            className="w-full text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px]"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.background.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
          >
            <MdPerson/>
            {!isCollapsed && <span className="text-lg align-middle pl-[15px]">Profile</span>}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={handleThemeToggle}
            className="w-fit text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] hover:scale-130"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className="relative w-[24px] h-[24px] flex items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiMoon size={20} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiSun size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>

          {/* Collasp Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-fit text-left px-[15px] rounded-lg mb-2 transition flex items-center text-lg h-[50px] hover:scale-130"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <div className="relative w-[24px] h-[24px] flex items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {isCollapsed ? (
                  <motion.div
                    key="expand"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.1 }}
                  >
                    <TbLayoutSidebarLeftExpandFilled size={20} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapse"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.1 }}
                  >
                    <TbLayoutSidebarRightExpand size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}