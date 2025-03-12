import React from "react";
import { CorbadoAuth } from "@corbado/react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate()
    const onLoggedIn = () => {
        localStorage.setItem("authMethod", "passkey");
        navigate('/');
    }


    const emailLogin = () => {
        navigate("/login")
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-[400px] bg-white-200 bg-opacity-30 text-black rounded-xl p-8 ">
            <h1 className="text-3xl font-bold text-center">Login using Passkeys</h1>
            <div className='Auth flex flex-col items-center mt-5'>
                <CorbadoAuth
                    onLoggedIn={onLoggedIn}
                />
                <h1 className="text-3xl font-semibold">or</h1>
                <button
                    onClick={emailLogin}
                    className="w-72 p-3 bg-[#002855] text-[#FFBF00] font-bold rounded-2xl shadow-md mt-4 hover:bg-gray-600 transition"
                >
                    Login with Email
                </button>
            </div>
        </div>
    </div>


    )
}