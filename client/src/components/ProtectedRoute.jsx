import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../api/auth"; // Get user from localStorage
import EmailVerificationMessage from "./EmailVerificationMessage";
const ProtectedRoute = () => {
    const currentUser = getCurrentUser();
    const username = currentUser ? currentUser.username : null;

    if (!currentUser) {
        return <Navigate to="/passkey" />;
    } else if (!currentUser.emailVerified) {
        return (<EmailVerificationMessage />);
    } else if (!username){
        return <Navigate to="/welcome" />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
