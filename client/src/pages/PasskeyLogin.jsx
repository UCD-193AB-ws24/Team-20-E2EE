import React from "react";
import { CorbadoAuth } from "@corbado/react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    const onLoggedIn = () => {
        const identifierRaw = localStorage.getItem("cbo_last_identifier");
    
        if (identifierRaw) {
            try {
                const identifier = JSON.parse(identifierRaw);
                const userInfo = {
                    email: identifier.value,
                    loginType: identifier.type,
                };
                localStorage.setItem("userInfo", JSON.stringify(userInfo));
            } catch (error) {
                console.error("Failed to parse cbo_last_identifier:", error);
            }
        }
    
        localStorage.setItem("authMethod", "passkey");
        navigate('/');
    };
    

    const emailLogin = () => {
        navigate("/login")
    }

    return (
        <div className='Auth flex flex-col items-center mt-5'>
    <CorbadoAuth
        onLoggedIn={onLoggedIn}
    />

    <button
        onClick={emailLogin}
        className="w-72 p-3 bg-[#002855] text-[#FFBF00] font-bold rounded-md shadow-md mt-4 hover:bg-gray-600 transition"
    >
        Login with Email
    </button>
</div>
    )
}