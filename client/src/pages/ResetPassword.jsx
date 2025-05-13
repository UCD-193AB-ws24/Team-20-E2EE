import React, { useState, useEffect } from "react";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { initializeApp } from "firebase/app";


const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "capstonee2ee.firebaseapp.com",
    projectId: "capstonee2ee",
    storageBucket: "capstonee2ee.firebasestorage.app",
    messagingSenderId: "372939690214",
    appId: "1:372939690214:web:a958e6b972d3de45232b27",
    measurementId: "G-PDWRQYQND1"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const ResetPassword = () => {
    const [oobCode, setOobCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("oobCode");
        if (code) {
            setOobCode(code);
            verifyPasswordResetCode(auth, code)
                .then((email) => {
                    setEmail(email);
                })
                .catch((err) => {
                    setStatus("Invalid or expired reset link.");
                });
        } else {
            setStatus("No reset code provided.");
        }
    }, []);

    const handleReset = async (e) => {
        e.preventDefault();
        setStatus("Processing...");
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setStatus("Password has been reset!");
            await fetch("/auth/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, newPassword }),
            });

        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "auto", paddingTop: 40 }}>
            <h2>Reset Your Password</h2>
            {email && <p>Resetting password for: {email}</p>}
            <form onSubmit={handleReset}>
                <label>New Password:</label>
                <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: "100%", marginBottom: "10px" }}
                />
                <button type="submit">Reset Password</button>
            </form>
            <p>{status}</p>
        </div>
    );
};

export default ResetPassword;