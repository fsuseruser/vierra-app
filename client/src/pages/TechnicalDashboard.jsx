import { useEffect, useState } from 'react';
import { api } from '../api.js';
import NavBar from '../components/NavBar.jsx';
import Kpi from '../components/Kpi.jsx';
import SearchInput from '../components/SearchInput.jsx';

export default function TechnicalDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.technicalOverview().then(setOverview).catch(() => {});
    api.technicalUsers().then(setUsers).catch(() => {});
  }, []);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <NavBar active="Technical" />
      <div className="page-body">
        <p className="muted">
          System health only — Technical accounts don't see investor profiles or lead details.
        </p>

        {overview && (
          <div className="kpi-row">
            <Kpi label="Total users" value={overview.totalUsers} tone="accent" />
            <Kpi label="Team Leads" value={overview.totalTeamLeads} />
            <Kpi label="Property Consultants" value={overview.totalConsultants} />
            <Kpi label="Total leads" value={overview.totalLeads} />
            <Kpi label="Total bookings" value={overview.totalBookings} tone="gold" />
            <Kpi label="Pending reminders" value={overview.pendingReminders} tone="warn" />
            <Kpi label="Google connected" value={overview.googleConnected} tone="success" />
          </div>
        )}

        <div className="card">
          <div className="table-head">
            <h2>All accounts</h2>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or role…" />
          </div>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Google Calendar</th><th>Created</th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="pill">{u.role.replace('_', ' ')}</span></td>
                  <td>{u.googleConnectedAt
                    ? <span className="pill pill-converted">Connected</span>
                    : <span className="pill pill-rejected">Not connected</span>}</td>
                  <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="muted">No accounts match that search.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
