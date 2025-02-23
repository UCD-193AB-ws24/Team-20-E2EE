import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ChatList from './components/ChatList';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Requests from './pages/Requests';
import Archive from './pages/Archive';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><ChatList /></Layout>} />
      <Route path="/home" element={<Layout><ChatList /></Layout>} />
      <Route path="/profile" element={<Layout><Profile /></Layout>} />
      <Route path="/friends" element={<Layout><Friends /></Layout>} />
      <Route path="/requests" element={<Layout><Requests /></Layout>} />
      <Route path="/archive" element={<Layout><Archive /></Layout>} />
    </Routes>
  );
}