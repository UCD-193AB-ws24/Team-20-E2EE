import React from "react";
import { CorbadoAuth } from "@corbado/react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate()
    const onLoggedIn = () => {
        navigate('/')
    }

    const emailLogin = () => {
        navigate("/login")
    }

    return (
        <div className='Auth' style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <CorbadoAuth
                onLoggedIn={onLoggedIn}
            />

            <button
                onClick={emailLogin}
                className="w-50 h-50 bg-black text-gray-100 font-bold rounded-full shadow-md mt-4 hover:bg-gray-600 transition"
            >
                Email Login
            </button>
        </div>
    )
}