import { Navigate, Outlet } from "react-router-dom";
import EmailVerificationMessage from "./EmailVerificationMessage";
import { useCorbado } from "@corbado/react"; // Corbado (Passkey) auth
import { useSelector } from "react-redux";

const ProtectedRoute = () => {
    const { userInfo: currentUser } = useSelector((state) => state.auth);
    const { isAuthenticated } = useCorbado();

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
