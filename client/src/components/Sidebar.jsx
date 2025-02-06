
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation(); // Get current URL path

  return (
    <div className="w-[15%] min-w-[200px] border-r border-gray-300 flex flex-col">
      <div className="flex flex-col items-center p-4 border-b border-gray-300">

        {/* Direct Messages Link */}
        <Link
          to="/"
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${
            location.pathname === '/' ? 'bg-gray-200 font-semibold' : 'bg-transparent'
          } hover:bg-gray-100`}
        >
          Direct Messages
        </Link>

        {/* Profile Link */}
        <Link
          to="/profile"
          className={`w-full text-left px-4 py-3 rounded-lg transition ${
            location.pathname === '/profile' ? 'bg-gray-200 font-semibold' : 'bg-transparent'
          } hover:bg-gray-100`}
        >
          Profile
        </Link>
      </div>
    </div>
  );
}
