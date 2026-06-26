import React from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import ScrollToTop from '@/components/ScrollToTop.jsx';

import RegisterPage from '@/pages/RegisterPage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import BoardsPage from '@/pages/BoardsPage.jsx';
import BoardDetailPage from '@/pages/BoardDetailPage.jsx';
import MyTasksPage from '@/pages/MyTasksPage.jsx';
import TeamMembersPage from '@/pages/TeamMembersPage.jsx';
import ActivityLogsPage from '@/pages/ActivityLogsPage.jsx';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard.jsx';
import SettingsPage from '@/pages/SettingsPage.jsx';
import ProfilePage from '@/pages/ProfilePage.jsx';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Router>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/boards" element={
              <ProtectedRoute>
                <BoardsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/board/:id" element={
              <ProtectedRoute>
                <BoardDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="/my-tasks" element={
              <ProtectedRoute>
                <MyTasksPage />
              </ProtectedRoute>
            } />
            
            <Route path="/team-members" element={
              <ProtectedRoute adminOnly>
                <TeamMembersPage />
              </ProtectedRoute>
            } />
            
            <Route path="/activity-logs" element={
              <ProtectedRoute adminOnly>
                <ActivityLogsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;