import React from "react";
import { Link } from "react-router-dom";

const EmailVerificationMessage = () => {
    return (
        <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <p><strong>Email Verification Required</strong></p>
            <p>Please check your email for a verification link before logging in.</p>
            <p className="mt-2">
                <Link to="/login" className="text-blue-500 underline">Go back to Login</Link>
            </p>
        </div>
    );
};

export default EmailVerificationMessage;
