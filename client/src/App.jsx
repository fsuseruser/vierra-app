import { Routes, Route, Navigate } from 'react-router-dom';
import { getStoredUser } from './api.js';
import Login from './pages/Login.jsx';
import NewLead from './pages/NewLead.jsx';
import ConsultantDashboard from './pages/ConsultantDashboard.jsx';
import TeamLeadDashboard from './pages/TeamLeadDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminTeam from './pages/AdminTeam.jsx';
import TechnicalDashboard from './pages/TechnicalDashboard.jsx';

function Protected({ roles, children }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'PROPERTY_CONSULTANT') return <Navigate to="/dashboard" replace />;
  if (user.role === 'TEAM_LEAD') return <Navigate to="/team-lead" replace />;
  if (user.role === 'TECHNICAL') return <Navigate to="/technical" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/new-lead" element={<Protected roles={['PROPERTY_CONSULTANT']}><NewLead /></Protected>} />
      <Route path="/dashboard" element={<Protected roles={['PROPERTY_CONSULTANT']}><ConsultantDashboard /></Protected>} />

      <Route path="/team-lead" element={<Protected roles={['TEAM_LEAD']}><TeamLeadDashboard /></Protected>} />

      <Route path="/admin" element={<Protected roles={['ADMIN']}><AdminDashboard /></Protected>} />
      <Route path="/admin/team" element={<Protected roles={['ADMIN']}><AdminTeam /></Protected>} />

      <Route path="/technical" element={<Protected roles={['TECHNICAL', 'ADMIN']}><TechnicalDashboard /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
