import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menu = [
  { path: '/', label: '🏠 Inicio' },
  { path: '/teachers', label: '👨‍ Docentes' },
  { path: '/areas', label: '📚 Áreas y Cursos' },
  { path: '/sedes', label: '🏫 Sedes y Salones' },
  { path: '/classes', label: '🗓️ Clases Asignadas' },
];

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-bold text-gray-800">📋 Control Asistencia</h1>
          <p className="text-xs text-gray-500">Docentes</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-800">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 mb-2">{user?.role}</p>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};