import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../api/auth"; // Get user from localStorage
import EmailVerificationMessage from "./EmailVerificationMessage";
const ProtectedRoute = () => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        return <Navigate to="/login" />;
    } else if (!currentUser.emailVerified) {
        return (<EmailVerificationMessage />);
    } 

    return <Outlet />;
};

export default ProtectedRoute;
