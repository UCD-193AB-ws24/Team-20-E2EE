import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCorbado } from "@corbado/react"; // Corbado (Passkey) auth

export default function AuthRedirectRoute() {
  const { userInfo, isAuthenticated } = useSelector((state) => state.auth);
  const { isAuthenticated: corbadoIsAuthenticated } = useCorbado();

  if (isAuthenticated && userInfo) {
    return <Navigate to="/" />;
  }

  if (corbadoIsAuthenticated) {
    return <Navigate to="/" />;
  };

  return <Outlet />;
}
