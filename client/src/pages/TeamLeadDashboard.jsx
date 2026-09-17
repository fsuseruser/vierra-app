import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import NavBar from '../components/NavBar.jsx';
import SearchInput from '../components/SearchInput.jsx';
import Kpi from '../components/Kpi.jsx';
import WeekCalendar, { mondayOf } from '../components/WeekCalendar.jsx';

function buildWhatsAppLink(reminder) {
  const lead = reminder.lead;
  const when = lead.booking ? `${lead.booking.date} at ${lead.booking.timeSlot.split('-')[0]}` : 'your upcoming appointment';
  const message = `Hi ${lead.fullName}, this is a reminder for ${when}. Looking forward to speaking with you!`;
  const phone = (lead.phone || '').replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function buildMailtoLink(reminder) {
  const lead = reminder.lead;
  const when = lead.booking ? `${lead.booking.date} at ${lead.booking.timeSlot.split('-')[0]}` : 'your upcoming appointment';
  const subject = encodeURIComponent('Reminder: your appointment with Vierra Property Brokers');
  const body = encodeURIComponent(`Hi ${lead.fullName},\n\nThis is a reminder for ${when}.\n\nLooking forward to speaking with you.\n\nVierra Property Brokers`);
  return `mailto:${lead.email}?subject=${subject}&body=${body}`;
}

// A Google Calendar "quick add" link — works without any OAuth setup at all,
// since it's just the browser opening Google Calendar's own compose screen.
function buildCalendarLink(reminder) {
  const lead = reminder.lead;
  if (!lead.booking) return null;
  const [y, m, d] = lead.booking.date.split('-').map(Number);
  const [startStr, endStr] = lead.booking.timeSlot.split('-');
  const [sh] = startStr.split(':').map(Number);
  const [eh] = endStr.split(':').map(Number);
  const fmt = (dt) => dt.toISOString().replace(/-|:|\.\d+/g, '');
  const start = new Date(y, m - 1, d, sh, 0, 0);
  const end = new Date(y, m - 1, d, eh, 0, 0);
  const text = encodeURIComponent(`Vierra: ${lead.fullName}`);
  const details = encodeURIComponent(`Follow-up with ${lead.fullName} (${lead.phone}, ${lead.email})`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
}

export default function TeamLeadDashboard() {
  const [consultants, setConsultants] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [consultantSearch, setConsultantSearch] = useState('');
  const [reminderSearch, setReminderSearch] = useState('');

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [calendar, setCalendar] = useState({ dates: [], bookings: [] });

  useEffect(() => { load(); }, []);
  useEffect(() => { loadCalendar(); }, [weekStart]);

  function load() {
    api.listUsers().then(setConsultants).catch(() => {});
    api.listReminders().then(setReminders).catch(() => {});
  }

  function loadCalendar() {
    api.weekBookings(weekStart.toISOString().slice(0, 10)).then(setCalendar).catch(() => {});
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
      await api.createUser({ ...form, role: 'PROPERTY_CONSULTANT' });
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markStatus(id, status) {
    await api.updateReminder(id, status);
    load();
  }

  const filteredConsultants = useMemo(() => {
    const q = consultantSearch.toLowerCase();
    if (!q) return consultants;
    return consultants.filter((c) => c.name.toLowerCase().includes(q));
  }, [consultants, consultantSearch]);

  const filteredReminders = useMemo(() => {
    const q = reminderSearch.toLowerCase();
    if (!q) return reminders;
    return reminders.filter((r) =>
      `${r.lead.fullName} ${r.lead.agent?.name}`.toLowerCase().includes(q)
    );
  }, [reminders, reminderSearch]);

  const pending = reminders.filter((r) => r.status === 'PENDING').length;
  const totalLeadsThisTeam = consultants.reduce((sum, c) => sum + (c._count?.leads || 0), 0);

  return (
    <div className="page">
      <NavBar active="Team Lead Dashboard" />
      <div className="page-body">
        <div className="kpi-row">
          <Kpi label="My consultants" value={consultants.length} tone="accent" />
          <Kpi label="Their leads" value={totalLeadsThisTeam} />
          <Kpi label="Pending reminders" value={pending} tone="warn" />
          <Kpi label="Bookings this week" value={calendar.bookings.length} tone="gold" />
        </div>

        <div className="grid-two">
          <div className="card">
            <div className="table-head">
              <h2>My consultants</h2>
              <SearchInput value={consultantSearch} onChange={setConsultantSearch} placeholder="Search…" />
            </div>
            <div className="consultant-list">
              {filteredConsultants.map((c) => (
                <div key={c.id} className="consultant-row">
                  <span>{c.name}</span>
                  <span className="muted">{c._count?.leads ?? 0} leads &middot; {c.points} pts</span>
                </div>
              ))}
              {filteredConsultants.length === 0 && <p className="muted">No consultants match that search.</p>}
            </div>
            <button type="button" className="btn-primary" onClick={() => setShowForm((s) => !s)}>+ Create Property Consultant</button>
            {showForm && (
              <form className="stacked-form" onSubmit={handleCreate}>
                <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <input placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="submit">Create</button>
              </form>
            )}
            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="card">
            <div className="table-head">
              <h2>Follow-up reminders</h2>
              <SearchInput value={reminderSearch} onChange={setReminderSearch} placeholder="Search leads…" />
            </div>
            <table>
              <thead><tr><th>Lead</th><th>Consultant</th><th>Appointment</th><th>Due</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filteredReminders.map((r) => {
                  const calLink = buildCalendarLink(r);
                  return (
                    <tr key={r.id}>
                      <td>{r.lead.fullName}</td>
                      <td>{r.lead.agent?.name}</td>
                      <td>{r.lead.booking ? `${r.lead.booking.date} ${r.lead.booking.timeSlot}` : '—'}</td>
                      <td>{new Date(r.dueAt).toLocaleString()}</td>
                      <td><span className={`pill pill-${r.status.toLowerCase()}`}>{r.status}</span></td>
                      <td className="row-actions">
                        <a className="btn-sm btn-whatsapp" href={buildWhatsAppLink(r)} target="_blank" rel="noreferrer" onClick={() => markStatus(r.id, 'SENT')}>WhatsApp</a>
                        <a className="btn-sm btn-outline" href={buildMailtoLink(r)} onClick={() => markStatus(r.id, 'SENT')}>Email</a>
                        {calLink && <a className="btn-sm btn-outline" href={calLink} target="_blank" rel="noreferrer">Calendar</a>}
                        <button type="button" className="btn-sm btn-muted" onClick={() => markStatus(r.id, 'DONE')}>Mark done</button>
                      </td>
                    </tr>
                  );
                })}
                {filteredReminders.length === 0 && <tr><td colSpan={6} className="muted">No reminders due.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="table-head">
            <h2>Booking calendar</h2>
            <span className="muted">Read-only view of your consultants' confirmed slots.</span>
          </div>
          <WeekCalendar
            weekStart={weekStart}
            dates={calendar.dates}
            bookings={calendar.bookings}
            onPrevWeek={() => shiftWeek(-7)}
            onNextWeek={() => shiftWeek(7)}
          />
        </div>
      </div>
    </div>
  );
}
