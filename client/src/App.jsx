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
import Welcome from './pages/Welcome';
import { SocketProvider } from './components/SocketContext';

export default function App() {
  // No need for socket initialization here anymore, it's handled by SocketProvider
  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Protected Routes - Only accessible to logged-in and verified users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><ChatList /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
          <Route path="/friends" element={<Layout><Friends /></Layout>} />
          <Route path="/requests" element={<Layout><Requests /></Layout>} />
          <Route path="/archive" element={<Layout><Archive /></Layout>} />
          <Route path="/welcome" element={<Welcome />} />
        </Route>
      </Routes>
    </SocketProvider>
  );
}