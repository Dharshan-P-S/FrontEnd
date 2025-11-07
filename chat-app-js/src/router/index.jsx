import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ChatPage from '../pages/ChatPage';
import CreateProfilePage from '../pages/CreateProfilePage'; // 1. Import new page

export default function AppRoutes() {
  const token = localStorage.getItem('authToken');
  const profile = localStorage.getItem('userProfile');

  const getAppPage = () => {
    if (!token) return <Navigate to="/login" />;
    if (!profile) return <CreateProfilePage />;
    return <ChatPage />;
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" />} />
      <Route path="/login" element={token ? <Navigate to="/app" /> : <LoginPage />} />
      <Route path="/create-profile" element={!token ? <Navigate to="/login" /> : <CreateProfilePage />} />
      <Route path="/app/*" element={getAppPage()} />
    </Routes>
  );
}