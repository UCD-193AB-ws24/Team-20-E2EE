import { useEffect } from "react";
import { getAuth, sendEmailVerification } from "firebase/auth";

const EmailVerification = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    useEffect(() => {
        if (user && !user.emailVerified) {
            sendEmailVerification(user).then(() => {
                console.log("Verification email sent");
            }).catch((error) => {
                console.error("Error sending verification email:", error);
            });
        }
    }, [user]);

    return (
        <div>
            <h2>Email Verification Required</h2>
            <p>A verification email has been sent to your email address.</p>
            <p>Please check your inbox and verify your email before logging in.</p>
        </div>
    );
};

export default EmailVerification;