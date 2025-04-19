import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { BACKEND_URL } from "../config/config.js";
import fetchWithAuth from "../util/FetchWithAuth.jsx";
export default function Welcome() {
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const title1 = "Welcome to EMA";
  const title2 = "Choose your username";

  useEffect(() => {
    let i = 0;
    let newText1 = "";
    const interval1 = setInterval(() => {
      if (i < title1.length) {
        newText1 += title1.charAt(i);
        setText1(newText1); 
        i++;
      } else {
        clearInterval(interval1);

        // Delay before starting the second animation
        setTimeout(() => {
          let j = 0;
          let newText2 = "";
          const interval2 = setInterval(() => {
            if (j < title2.length) {
              newText2 += title2.charAt(j);
              setText2(newText2);
              j++;
            } else {
              clearInterval(interval2);
            }
          }, 50);
        }, 100);
      }
    }, 50);

    return () => clearInterval(interval1);
  }, []);

    // Function to update username in the backend
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
  
      if (!username.trim()) {
        setError("Username cannot be empty");
        return;
      }
  
      try {
        const response = await fetchWithAuth(`${BACKEND_URL}/api/user/update-username`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          const user = JSON.parse(localStorage.getItem("user")) || {};
          user.username = username;
          localStorage.setItem("user", JSON.stringify(user))
          navigate("/"); // Redirect to home after successful update
        } else {
          setError(data.error || "Failed to update username");
        }
      } catch (error) {
        console.error("Error updating username:", error);
        setError("Something went wrong. Please try again.");
      }
    };

  const handleChange = (e) => {
    setUsername(e.target.value);
  }; 

  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center justify-center mt-[-10rem] w-full max-w-xl">
        {/* Typing Animation Text */}
        <h1 className="text-3xl font-bold text-[#1D4776] text-center ml-[-50px] h-[40px]">
          {text1}
        </h1>
        <h3 className="text-2xl font-bold text-[#FFC519] text-center ml-[-50px] mt-2 h-[30px]">
          {text2}
        </h3>

        {/* Username Input Form */}
        <form className="w-full flex flex-row gap-4 items-center justify-center">
          <input type="text" placeholder="Username"
            onChange={handleChange}
            value={username}
            className="border-2 border-gray-400 p-4 rounded-lg mt-4 focus:border-[#1D4776] outline-none w-full max-w-md"
          />
          <button type="submit" onClick={handleSubmit} className="flex items-center justify-center w-12 h-12 mt-4 bg-[#1D4776] text-white rounded-full cursor-pointer hover:bg-[#355B85]">
            <ArrowForwardIcon />
          </button>
        </form>
        {error ? <p className="text-red-500 mt-2">{error}</p> : null}
      </div>
    </div>
  );
}
