import React, { useState } from 'react';
import { clearAllStorage } from '../util/clearStorage';

const ClearStorageButton = () => {
  const [isClearing, setIsClearing] = useState(false);
  
  const handleClearStorage = async () => {
    if (window.confirm('Are you sure you want to clear all local storage? This will remove all cached messages and require you to re-establish secure sessions.')) {
      setIsClearing(true);
      try {
        await clearAllStorage();
        alert('Storage cleared successfully! The page will now reload.');
        // Reload the page to ensure a clean state
        window.location.reload();
      } catch (error) {
        console.error('Error clearing storage:', error);
        alert('Failed to clear storage. See console for details.');
        setIsClearing(false);
      }
    }
  };
  
  return (
    <button
      onClick={handleClearStorage}
      disabled={isClearing}
      className="clear-storage-btn"
      style={{
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '0.375rem 0.75rem',
        fontSize: '0.875rem',
        cursor: isClearing ? 'not-allowed' : 'pointer',
        opacity: isClearing ? 0.6 : 1
      }}
    >
      {isClearing ? 'Clearing...' : 'Clear Storage'}
    </button>
  );
};

export default ClearStorageButton;