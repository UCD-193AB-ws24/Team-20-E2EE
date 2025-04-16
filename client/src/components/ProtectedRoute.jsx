import { Navigate, Outlet } from "react-router-dom";
import EmailVerificationMessage from "./EmailVerificationMessage";
import getCurrentUser from "../util/getCurrentUser.js"; // Get user from localStorage
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
