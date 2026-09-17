import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import NavBar from '../components/NavBar.jsx';
import SearchInput from '../components/SearchInput.jsx';
import WeekCalendar, { mondayOf } from '../components/WeekCalendar.jsx';

export default function AdminTeam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TEAM_LEAD', supervisorId: '' });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [google, setGoogle] = useState({ configured: false, connected: false });
  const googleNotice = searchParams.get('google');

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [calendar, setCalendar] = useState({ dates: [], bookings: [] });

  useEffect(() => { load(); }, []);
  useEffect(() => { api.googleStatus().then(setGoogle).catch(() => {}); }, [googleNotice]);
  useEffect(() => { loadCalendar(); }, [weekStart]);

  function load() {
    api.listUsers().then(setUsers).catch(() => {});
    api.listTeamLeads().then(setTeamLeads).catch(() => {});
  }

  function loadCalendar() {
    const startStr = weekStart.toISOString().slice(0, 10);
    api.weekBookings(startStr).then(setCalendar).catch(() => {});
  }

  function shiftWeek(days) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + days);
    setWeekStart(next);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (payload.role !== 'PROPERTY_CONSULTANT') delete payload.supervisorId;
      await api.createUser(payload);
      setForm({ name: '', email: '', password: '', role: 'TEAM_LEAD', supervisorId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDisconnectGoogle() {
    await api.disconnectGoogle();
    setGoogle((g) => ({ ...g, connected: false }));
  }

  function dismissNotice() {
    searchParams.delete('google');
    setSearchParams(searchParams, { replace: true });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="page">
      <NavBar active="Team & Calendar" />
      <div className="page-body">

        {googleNotice === 'connected' && (
          <div className="banner banner-success">Google Calendar connected. <button className="btn-ghost" onClick={dismissNotice}>Dismiss</button></div>
        )}
        {googleNotice === 'not_configured' && (
          <div className="banner banner-warn">
            Google Calendar isn't set up yet — add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI
            to the server's environment variables (see README) and try again.
            <button className="btn-ghost" onClick={dismissNotice}>Dismiss</button>
          </div>
        )}
        {googleNotice === 'error' && (
          <div className="banner banner-danger">Something went wrong connecting Google Calendar. Please try again. <button className="btn-ghost" onClick={dismissNotice}>Dismiss</button></div>
        )}

        <div className="card">
          <div className="table-head">
            <div>
              <h2>Team</h2>
              <p className="muted">Team Leads create Property Consultants directly; Admin can also create either and assigns each consultant a Team Lead.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search team…" />
              <button type="button" className="btn-primary" onClick={() => setShowForm((s) => !s)}>+ Add team member</button>
            </div>
          </div>

          {showForm && (
            <form className="inline-form" onSubmit={handleCreate}>
              <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="PROPERTY_CONSULTANT">Property Consultant</option>
                <option value="TECHNICAL">Technical</option>
              </select>
              {form.role === 'PROPERTY_CONSULTANT' && (
                <select value={form.supervisorId} onChange={(e) => setForm({ ...form, supervisorId: e.target.value })} required>
                  <option value="">Reports to…</option>
                  {teamLeads.map((tl) => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                </select>
              )}
              <button type="submit">Create</button>
            </form>
          )}
          {error && <div className="form-error">{error}</div>}

          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Reports to</th><th>Leads</th><th>Points</th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td><span className="pill">{u.role.replace('_', ' ')}</span></td>
                  <td>{u.supervisor?.name || '—'}</td>
                  <td>{u._count?.leads ?? '—'}</td>
                  <td>{u.points}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="muted">No team members match that search.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="table-head">
            <h2>Booking calendar</h2>
            <span className="muted">All confirmed slots across every consultant.</span>
          </div>
          <WeekCalendar
            weekStart={weekStart}
            dates={calendar.dates}
            bookings={calendar.bookings}
            onPrevWeek={() => shiftWeek(-7)}
            onNextWeek={() => shiftWeek(7)}
          />
        </div>

        <div className="card">
          <h3>Your Google Calendar</h3>
          <p className="muted">Link your calendar so every confirmed booking can be added automatically.</p>
          <div className="integration-status">
            <span className={`pill ${google.connected ? 'pill-converted' : 'pill-rejected'}`}>
              {google.connected ? 'Connected' : 'Not connected'}
            </span>
            {google.connected ? (
              <button type="button" className="btn-outline" onClick={handleDisconnectGoogle}>Disconnect</button>
            ) : (
              <a className="btn-outline" href="/api/integrations/google/connect">Link Google Calendar</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
