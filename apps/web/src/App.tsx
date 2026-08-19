import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/layout/Layout';
import { TeachersPage } from './pages/TeachersPage';
import { AreasPage } from './pages/AreasPage';
import { SedesPage } from './pages/SedesPage';
import { TeacherClassesPage } from './pages/TeacherClassesPage';
import { DailyAttendancePage } from './pages/DailyAttendancePage';
import { WeeklyViewPage } from './pages/WeeklyViewPage';
import { ReportsPage } from './pages/ReportsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ValidationPage } from './pages/ValidationPage';
import { PeriodsPage } from './pages/PeriodsPage';
import { UsersPage } from './pages/UsersPage';
import { ImportsPage } from './pages/ImportsPage';
import { BlocksPage } from './pages/BlocksPage';
import { ComparePage } from './pages/ComparePage';
import { ToolsHomePage } from './pages/ToolsHomePage';
import { SchedulePage } from './pages/SchedulePage';
import { CrossPage } from './pages/CrossPage';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/periods" element={<PeriodsPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/blocks" element={<BlocksPage />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/sedes" element={<SedesPage />} />
          <Route path="/classes" element={<TeacherClassesPage />} />
          <Route path="/attendance/daily" element={<DailyAttendancePage />} />
          <Route path="/attendance/weekly" element={<WeeklyViewPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/tools" element={<ToolsHomePage />} />
          <Route path="/tools/compare" element={<ComparePage />} />
          <Route path="/tools/schedule" element={< SchedulePage />} />
          <Route path="/tools/cross" element={<CrossPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;