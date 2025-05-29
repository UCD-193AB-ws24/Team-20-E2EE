import React from "react";
import { Outlet, Navigate } from "react-router-dom";

export default function WelcomeScreenRedirectRoute() {
  const user = localStorage.getItem("user");
  if(!user) {
    return <Navigate to="/login" />;
  }
  const username = user ? JSON.parse(user).username : null;
  
  if (username) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}
