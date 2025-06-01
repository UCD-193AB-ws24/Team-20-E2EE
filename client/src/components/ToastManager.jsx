import React, { useState } from 'react';
import Toast from './Toast';

let toastManager = null;

export const showToast = (message, type = 'info', duration = 4000) => {
  if (toastManager) {
    toastManager.addToast(message, type, duration);
  }
};

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);

  React.useEffect(() => {
    toastManager = {
      addToast: (message, type, duration) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
      }
    };

    return () => {
      toastManager = null;
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 w-full max-w-sm">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}