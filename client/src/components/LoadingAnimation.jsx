import React from 'react';

/**
 * A reusable loading spinner component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner ('small', 'medium', 'large')
 * @param {string} [props.color='#022851'] - Color theme
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function LoadingAnimation({ size = 'medium', color = '#022851', className = '' }) {
  // Size mapping
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-t-2 border-b-2',
    large: 'h-12 w-12 border-4'
  };
  
  // Color mapping
  const colorClasses = {
    gray: 'border-gray-400',
    white: 'border-white'
  };
  
  return (
    <div 
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}