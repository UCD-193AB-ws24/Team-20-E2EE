import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
    const { currentUser } = useAuth();

    // Check if the user is logged in and email is verified
    if (!currentUser) {
        return <Navigate to="/signin" />;
    } else if (!currentUser.emailVerified) {
        return <Navigate to="/email-verification" />;
    }

    return <Outlet />;
};

export default ProtectedRoute;