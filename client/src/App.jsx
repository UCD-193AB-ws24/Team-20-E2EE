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

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Protected Routes - Only accessible to logged-in and verified users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/archive" element={<Archive />} />
      </Route>
    </Routes>
  );
}