import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    verifyPasswordResetCode,
    confirmPasswordReset,
} from "firebase/auth";
import { BACKEND_URL } from "../config/config";
import { useNavigate } from "react-router-dom";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "capstonee2ee.firebaseapp.com",
    projectId: "capstonee2ee",
    storageBucket: "capstonee2ee.firebasestorage.app",
    messagingSenderId: "372939690214",
    appId: "1:372939690214:web:a958e6b972d3de45232b27",
    measurementId: "G-PDWRQYQND1",
};

if (!getApps().length) {
    initializeApp(firebaseConfig);
}
const auth = getAuth();

export default function ResetPassword() {
    const navigate = useNavigate();
    const [oobCode, setOobCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("oobCode");

        if (!code) {
            setStatus("No reset code provided.");
            return;
        }

        setOobCode(code);
        verifyPasswordResetCode(auth, code)
            .then((email) => {
                setEmail(email);
                setStatus("");
            })
            .catch(() => {
                setStatus("Invalid or expired reset link.");
            });
    }, []);

    const handleReset = async (e) => {
        e.preventDefault();
        setStatus("Processing...");

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);

            const res = await fetch(`${BACKEND_URL}/api/auth/update-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, newPassword }),
            });

            const contentType = res.headers.get("content-type");
            let data = {};
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            }

            if (res.ok) {
                setStatus("Your password has been successfully reset.");
                setSuccess(true);
            } else {
                setStatus(data.error || "Password updated in Firebase, but failed in database.");
            }
        } catch (err) {
            console.error(err);
            setStatus("An error occurred. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-[400px]">
                <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
                {email && (
                    <p className="text-sm text-gray-600 mb-4">
                        Resetting password for: <strong>{email}</strong>
                    </p>
                )}
                <form onSubmit={handleReset}>
                    <input
                        type="password"
                        placeholder="Enter new password"
                        className="w-full p-2 border border-gray-300 rounded mb-4"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-[#1D4776] text-[#FFC519] font-bold p-2 rounded hover:brightness-110 cursor-pointer hover:translate-y-[-2px] transition-transform shadow-md"          >
                        Reset Password
                    </button>
                </form>

                {status && (
                    <p
                        className={`mt-4 ${status.toLowerCase().includes("error") || status.includes("failed")
                            ? "text-red-600"
                            : "text-green-600"
                            }`}
                    >
                        {status}
                    </p>
                )}

                {success && (
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full mt-4 bg-gray-200 text-black font-bold p-2 rounded hover:brightness-105 cursor-pointer hover:translate-y-[-2px] transition-transform shadow-md"                    >
                        Back to Login
                    </button>
                )}
            </div>
        </div>
    );
}
