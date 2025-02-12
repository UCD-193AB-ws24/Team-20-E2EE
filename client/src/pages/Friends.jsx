import React from 'react';
import Sidebar from '../components/Sidebar';

export default function Friends() {
  return (
    <div className="h-screen flex">
      {/* LEFT SIDEBAR */}
      <Sidebar />

      {/* FRIENDS CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-blue-500">Friends Page</h1>
        <p className="text-lg text-gray-600 mt-4">Your friends list goes here...</p>
      </div>
    </div>
  );
}