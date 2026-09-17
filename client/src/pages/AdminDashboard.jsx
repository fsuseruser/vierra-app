import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import NavBar from '../components/NavBar.jsx';
import LeadProfileDrawer from '../components/LeadProfileDrawer.jsx';
import SearchInput from '../components/SearchInput.jsx';
import Kpi from '../components/Kpi.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';

const OBJECTIVE_LABELS = {
  CAPITAL_APPRECIATION: 'Capital appreciation',
  RENTAL_YIELD: 'Rental yield',
  SHORT_TERM_RESALE: 'Short-term resale',
  LONG_TERM_WEALTH: 'Long-term wealth',
  EQUITY_RELEASE: 'Equity release',
  COMBINATION: 'Combination'
};

export default function AdminDashboard() {
  const [leads, setLeads] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => { load(); }, [filters]);
  useEffect(() => { api.leaderboard().then(setLeaderboard).catch(() => {}); }, []);

  function load() {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.listLeads(params).then(setLeads).catch(() => {});
  }

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleExport() {
    setExportError('');
    setExporting(true);
    try {
      await api.downloadLeadsCsv(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      `${l.fullName} ${l.phone} ${l.email} ${l.agent?.name} ${l.status}`.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const converted = leads.filter((l) => l.status === 'CONVERTED').length;
  const qualified = leads.filter((l) => l.status === 'QUALIFIED').length;
  const booked = leads.filter((l) => l.booking).length;
  const avgInvestment = leads.length
    ? Math.round(leads.reduce((sum, l) => sum + Number(l.intendedInvestment || 0), 0) / leads.length)
    : 0;

  const statusData = [
    { label: 'New', value: leads.filter((l) => l.status === 'NEW').length },
    { label: 'Qualified', value: qualified },
    { label: 'Converted', value: converted },
    { label: 'Rejected', value: leads.filter((l) => l.status === 'REJECTED').length }
  ];

  const objectiveCounts = {};
  leads.forEach((l) => {
    objectiveCounts[l.investmentObjective] = (objectiveCounts[l.investmentObjective] || 0) + 1;
  });
  const objectiveData = Object.entries(objectiveCounts).map(([key, value]) => ({
    label: OBJECTIVE_LABELS[key] || key,
    value
  }));

  return (
    <div className="page">
      <NavBar active="Overview" />
      <div className="page-body">
        <div className="kpi-row">
          <Kpi label="Total leads" value={leads.length} tone="accent" />
          <Kpi label="Qualified" value={qualified} tone="warn" />
          <Kpi label="Converted" value={converted} tone="success" />
          <Kpi label="Booked" value={booked} tone="gold" />
          <Kpi label="Avg. intended investment" value={`AED ${avgInvestment.toLocaleString()}`} />
        </div>

        <div className="two-col-charts">
          <div className="card">
            <h2>Leads by status</h2>
            <BarChart data={statusData} />
          </div>
          <div className="card">
            <h2>Investment objective mix</h2>
            {objectiveData.length > 0
              ? <DonutChart data={objectiveData} />
              : <p className="muted">No leads yet.</p>}
          </div>
        </div>

        <div className="card">
          <div className="table-head">
            <h2>All leads</h2>
            <div className="filters">
              <SearchInput value={search} onChange={setSearch} placeholder="Search leads or consultants…" />
              <select onChange={(e) => setFilter('assetPortfolio', e.target.value)} defaultValue="">
                <option value="">Asset portfolio: any</option>
                <option value="UNDER_1M">Under AED 1M</option>
                <option value="R1_5M">AED 1M–5M</option>
                <option value="R5_10M">AED 5M–10M</option>
                <option value="R10_25M">AED 10M–25M</option>
                <option value="OVER_25M">AED 25M+</option>
              </select>
              <select onChange={(e) => setFilter('liquidCapital', e.target.value)} defaultValue="">
                <option value="">Liquid capital: any</option>
                <option value="UNDER_500K">Under AED 500K</option>
                <option value="R500K_1M">AED 500K–1M</option>
                <option value="R1_3M">AED 1M–3M</option>
                <option value="R3_5M">AED 3M–5M</option>
                <option value="OVER_5M">AED 5M+</option>
              </select>
              <select onChange={(e) => setFilter('investmentObjective', e.target.value)} defaultValue="">
                <option value="">Objective: any</option>
                {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" className="btn-primary" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          </div>
          {exportError && <div className="form-error">{exportError}</div>}
          <table>
            <thead><tr><th>Name</th><th>Consultant</th><th>Asset portfolio</th><th>Liquid capital</th><th>Status</th><th>Booked slot</th></tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="clickable-row" onClick={() => setSelectedLead(l.id)}>
                  <td>{l.salutation} {l.fullName}</td>
                  <td>{l.agent?.name}</td>
                  <td>{l.assetPortfolio}</td>
                  <td>{l.liquidCapital}</td>
                  <td><span className={`pill pill-${l.status.toLowerCase()}`}>{l.status}</span></td>
                  <td>{l.booking ? `${l.booking.date} ${l.booking.timeSlot}` : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="muted">No leads match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Leaderboard</h2>
          <ol className="leaderboard">
            {leaderboard.map((c) => <li key={c.id}><span>{c.name}</span><span>{c.points}</span></li>)}
          </ol>
        </div>
      </div>
      <LeadProfileDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
