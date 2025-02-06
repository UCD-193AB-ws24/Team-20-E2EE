import React from 'react';
import Sidebar from '../components/Sidebar';

export default function Profile() {
  return (
    <div className="h-screen flex">
      {/* LEFT SIDEBAR */}
      <Sidebar />

      {/* PROFILE CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-blue-500">Profile Page</h1>
        <p className="text-lg text-gray-600 mt-4">Your profile details go here...</p>
      </div>
    </div>
  );
}
