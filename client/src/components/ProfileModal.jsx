import React from 'react';
import Profile from '../pages/Profile';

export default function ProfileModal({ onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <Profile onClose={onClose} />
    </div>
  );
}