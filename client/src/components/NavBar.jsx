import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdMessage, MdPeople, MdPersonAdd, MdArchive, MdPerson } from 'react-icons/md';

export default function NavBar({ onProfileClick, setView }) {
  const location = useLocation();

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
        >
          <MdPersonAdd className={`mr-3 ${location.pathname === '/requests' ? 'text-ucd-blue-800' : 'text-ucd-blue-600'}`} />
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