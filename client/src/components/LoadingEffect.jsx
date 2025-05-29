import React from 'react';

export default function LoadingEffect() {
  return (
    <div className="w-40 h-40">
      <style>{`
        @keyframes jump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20%); }
        }
        .jump-animation {
          animation: jump 1s ease-in-out infinite;
        }
      `}</style>
      <img className="w-full h-full jump-animation" src="/images/ema-logo.png" alt="Loading" />
    </div>
  );
}