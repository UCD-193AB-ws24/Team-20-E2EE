import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatList, Layout, ProtectedRoute, AuthRedirectRoute, WelcomeScreenRedirectRoute, SocketProvider } from './components';
import { ForgotPassword, Friends, Login, Profile, Requests, ResetPassword, SignUp, Welcome, Passkey, PasskeyManagement } from './pages';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthRedirectRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/passkey" element={<Passkey />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
      </Route>
      
      <Route element={<WelcomeScreenRedirectRoute />} >
        <Route path="/welcome" element={<Welcome />} />
      </Route>
      {/* Protected Routes - Only accessible to logged-in and verified users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout><ChatList /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/passkey-management" element={<Layout><PasskeyManagement /></Layout>} />
        <Route path="/friends" element={<Layout><Friends /></Layout>} />
        <Route path="/requests" element={<Layout><Requests /></Layout>} />
      </Route>
    </Routes>
  );
}