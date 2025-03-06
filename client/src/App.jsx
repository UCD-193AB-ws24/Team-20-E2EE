import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ChatList from './components/ChatList';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Requests from './pages/Requests';
import Archive from './pages/Archive';
import SignUp from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { CorbadoProvider } from "@corbado/react";
import PasskeyLogin from './pages/PasskeyLogin';
import PasskeyHome from './pages/PasskeyHome'


const CORBADO_PROJECT_ID = import.meta.env.VITE_REACT_APP_CORBADO_PROJECT_ID;


export default function App() {
  return (
    <CorbadoProvider projectId={CORBADO_PROJECT_ID} darkMode='on'>

    <Routes>
      {/* Public Routes */}
      <Route path="/passkeylogin" element={<PasskeyLogin />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      


      {/* Protected Routes - Only accessible to logged-in and verified users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout><ChatList /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/friends" element={<Layout><Friends /></Layout>} />
        <Route path="/requests" element={<Layout><Requests /></Layout>} />
        <Route path="/archive" element={<Layout><Archive /></Layout>} />
      </Route>
    </Routes>
    </CorbadoProvider>
  );
}