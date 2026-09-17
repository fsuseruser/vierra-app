import { useNavigate } from 'react-router-dom';
import { getStoredUser, clearSession } from '../api.js';

const LINKS = {
  PROPERTY_CONSULTANT: [['/dashboard', 'Dashboard'], ['/new-lead', 'New Lead']],
  TEAM_LEAD: [['/team-lead', 'Team Lead Dashboard']],
  ADMIN: [['/admin', 'Overview'], ['/admin/team', 'Team & Calendar']],
  TECHNICAL: [['/technical', 'Technical']]
};

const ROLE_LABELS = {
  PROPERTY_CONSULTANT: 'Property Consultant',
  TEAM_LEAD: 'Team Lead',
  ADMIN: 'Admin',
  TECHNICAL: 'Technical'
};

export default function NavBar({ active }) {
  const user = getStoredUser();
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="navbar">
      <div className="navbar-left">
        <img src="/vierra-mark.png" alt="" className="navbar-mark" />
        <div className="navbar-brand-block">
          <span className="brand">Vierra</span>
          <span className="navbar-tagline">Grow &middot; Invest &middot; Manage</span>
        </div>
        <span className="divider" />
        {(LINKS[user?.role] || []).map(([to, label]) => (
          <a key={to} href={to} className={active === label ? 'nav-active' : ''}>{label}</a>
        ))}
      </div>
      <div className="navbar-right">
        <span className="muted">{user?.name} &middot; {ROLE_LABELS[user?.role] || user?.role}</span>
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
