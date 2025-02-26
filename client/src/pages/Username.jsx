import React from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function Username() {
  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center justify-center mt-[-10rem] w-full max-w-xl">
        <h1 className="text-3xl font-bold text-[#1D4776] text-center ml-[-50px]">
          Choose your username
        </h1>
        <div className="flex flex-row gap-4 items-center w-full justify-center">
          <input
            type="text"
            placeholder="Username"
            className="border-2 border-gray-400 p-4 rounded-lg mt-4 focus:border-[#1D4776] outline-none w-full max-w-md"
          />
          <button className="flex items-center justify-center w-12 h-12 mt-4 bg-[#1D4776] text-white rounded-full cursor-pointer hover:bg-[#355B85]">
            <ArrowForwardIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
