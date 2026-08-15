import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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

const Home: React.FC = () => {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Bienvenido, {user?.firstName} 👋
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-700">👨‍🏫 Docentes</h2>
          <p className="text-sm text-gray-500 mt-1">Gestiona el registro de docentes</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-700">🗓️ Clases</h2>
          <p className="text-sm text-gray-500 mt-1">Asigna clases: docente + curso + sede + día</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-700">✅ Fase 2 completa</h2>
          <p className="text-sm text-gray-500 mt-1">Siguiente: Asistencia diaria (Fase 3)</p>
        </div>
      </div>
    </div>
  );
};

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
          <Route path="/" element={<Home />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/sedes" element={<SedesPage />} />
          <Route path="/classes" element={<TeacherClassesPage />} />
          <Route path="/attendance/daily" element={<DailyAttendancePage />} />
          <Route path="/attendance/weekly" element={<WeeklyViewPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;