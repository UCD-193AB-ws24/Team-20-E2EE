import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatList, Layout, ProtectedRoute, SocketProvider } from './components';
import { Archive, Friends, Login, Profile, Requests, SignUp, Welcome } from './pages';
import PasskeyLogin from './pages/PasskeyLogin';
import TraditionalAuthRoute from './components/AuthRedirectRoute';

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        {/* Redirect to login if not authenticated */}

        <Route element={<TraditionalAuthRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/passkeylogin" element={<PasskeyLogin />} />
        </Route>

        {/* Protected Routes - Only accessible to logged-in and verified users */}
        <Route path="/" element={<ProtectedRoute />}>
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