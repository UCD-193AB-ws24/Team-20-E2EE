import React from 'react'
import {Outlet, Navigate} from 'react-router-dom';

export default function AuthRedirectRoute() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  if(currentUser){
    return <Navigate to="/" replace />;
  }
  return <Outlet />
}
