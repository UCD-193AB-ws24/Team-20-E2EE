import React from 'react';

/**
 * A reusable loading spinner component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner ('small', 'medium', 'large')
 * @param {string} [props.color='ucd-blue'] - Color theme ('ucd-blue', 'ucd-gold', 'gray')
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function LoadingAnimation({ size = 'medium', color = 'ucd-blue', className = '' }) {
  // Size mapping
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-t-2 border-b-2',
    large: 'h-12 w-12 border-4'
  };
  
  // Color mapping
  const colorClasses = {
    'ucd-blue': 'border-ucd-blue-600',
    'ucd-gold': 'border-ucd-gold-600',
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