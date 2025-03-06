import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../api/auth"; // Get user from localStorage
import EmailVerificationMessage from "./EmailVerificationMessage";
import { useCorbado } from "@corbado/react"; // Corbado (Passkey) auth

const ProtectedRoute = () => {
    const currentUser = getCurrentUser(); // Check Traditional Login
    const { isAuthenticated } = useCorbado(); // Check Passkey Login

    // If the user is NOT logged in via EITHER method, redirect to login selection
    if (!currentUser && !isAuthenticated) {
        return <Navigate to="/login" />;
    }

    // If user is logged in via traditional email/password but email is not verified, show verification message
    if (currentUser && !currentUser.emailVerified) {
        return <EmailVerificationMessage />;
    }

    // If the user is authenticated via Passkey OR Traditional login, allow access
    return <Outlet />;
};

export default ProtectedRoute;
