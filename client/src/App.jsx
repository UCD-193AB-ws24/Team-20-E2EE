import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatList, Layout, ProtectedRoute, AuthRedirectRoute, WelcomeScreenRedirectRoute, SocketProvider } from './components';
import { Archive, Friends, Login, Profile, Requests, SignUp, Welcome, Passkey } from './pages';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthRedirectRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/passkey" element={<Passkey />} />
      </Route>
      
      <Route element={<WelcomeScreenRedirectRoute />} >
        <Route path="/welcome" element={<Welcome />} />
      </Route>
      {/* Protected Routes - Only accessible to logged-in and verified users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout><ChatList /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/friends" element={<Layout><Friends /></Layout>} />
        <Route path="/requests" element={<Layout><Requests /></Layout>} />
        <Route path="/archive" element={<Layout><Archive /></Layout>} />
      </Route>
    </Routes>
  );
}