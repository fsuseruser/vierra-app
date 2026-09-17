import { useEffect, useMemo, useState } from 'react';
import { api, getStoredUser } from '../api.js';
import NavBar from '../components/NavBar.jsx';
import LeadProfileDrawer from '../components/LeadProfileDrawer.jsx';
import SearchInput from '../components/SearchInput.jsx';
import Kpi from '../components/Kpi.jsx';

export default function ConsultantDashboard() {
  const user = getStoredUser();
  const [leads, setLeads] = useState([]);
  const [goal, setGoal] = useState({ target: 10, thisWeek: 0, lastWeek: 0 });
  const [showLastWeek, setShowLastWeek] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.listLeads().then(setLeads).catch(() => {});
    api.weeklyGoal().then(setGoal).catch(() => {});
  }, []);

  const shown = showLastWeek ? goal.lastWeek : goal.thisWeek;
  const pct = Math.min(100, Math.round((shown / goal.target) * 100));

  const converted = leads.filter((l) => l.status === 'CONVERTED').length;
  const qualified = leads.filter((l) => l.status === 'QUALIFIED').length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      `${l.fullName} ${l.phone} ${l.email} ${l.status}`.toLowerCase().includes(q)
    );
  }, [leads, search]);

  return (
    <div className="page">
      <NavBar active="Dashboard" />
      <div className="page-body">
        <div className="stat-row">
          <div className="card progress-card">
            <div className="progress-head">
              <span>Progress toward {showLastWeek ? 'last' : "this"} week's goal</span>
              <div className="toggle-pair">
                <button type="button" className={!showLastWeek ? 'toggle-active' : ''} onClick={() => setShowLastWeek(false)}>This week</button>
                <button type="button" className={showLastWeek ? 'toggle-active' : ''} onClick={() => setShowLastWeek(true)}>Last week</button>
              </div>
              <span>{shown} of {goal.target} qualified leads</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          <Kpi label="Points balance" value={user?.points ?? 0} tone="accent" />
          <Kpi label="Qualified" value={qualified} tone="warn" />
          <Kpi label="Converted" value={converted} tone="success" />
        </div>

        <div className="card">
          <div className="table-head">
            <h2>My leads</h2>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, email…" />
          </div>
          <table>
            <thead>
              <tr><th>Name</th><th>Asset portfolio</th><th>Liquid capital</th><th>Status</th><th>Booked slot</th></tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="clickable-row" onClick={() => setSelectedLead(l.id)}>
                  <td>{l.salutation} {l.fullName}</td>
                  <td>{l.assetPortfolio}</td>
                  <td>{l.liquidCapital}</td>
                  <td><span className={`pill pill-${l.status.toLowerCase()}`}>{l.status}</span></td>
                  <td>{l.booking ? `${l.booking.date} ${l.booking.timeSlot}` : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="muted">No leads match that search.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <LeadProfileDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
