import { useEffect, useState } from 'react';
import { api } from '../api.js';

const LABELS = {
  previousExperience: { NO: 'No', UAE: 'Yes — UAE', INTERNATIONAL: 'Yes — International', BOTH: 'Yes — Both UAE & International' },
  assetPortfolio: { UNDER_1M: 'Under AED 1M', R1_5M: 'AED 1M–5M', R5_10M: 'AED 5M–10M', R10_25M: 'AED 10M–25M', OVER_25M: 'AED 25M+' },
  liquidCapital: { UNDER_500K: 'Under AED 500K', R500K_1M: 'AED 500K–1M', R1_3M: 'AED 1M–3M', R3_5M: 'AED 3M–5M', OVER_5M: 'AED 5M+' },
  investmentHorizon: { Y1_3: '1–3 years', Y3_5: '3–5 years', Y5_10: '5–10 years', Y10_PLUS: '10+ years' },
  investmentObjective: {
    CAPITAL_APPRECIATION: 'Capital appreciation', RENTAL_YIELD: 'Rental income / yield',
    SHORT_TERM_RESALE: 'Short-term resale', LONG_TERM_WEALTH: 'Long-term wealth creation',
    EQUITY_RELEASE: 'Equity release / portfolio expansion', COMBINATION: 'Combination of the above'
  }
};

export default function LeadProfileDrawer({ leadId, onClose }) {
  const [lead, setLead] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLead(null);
    setError('');
    if (!leadId) return;
    api.getLead(leadId).then(setLead).catch((e) => setError(e.message));
  }, [leadId]);

  if (!leadId) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        {error && <div className="form-error">{error}</div>}
        {!lead ? <p>Loading…</p> : (
          <>
            <h2>{lead.salutation} {lead.fullName}</h2>
            <p className="muted">{lead.phone} &middot; {lead.email}</p>
            <span className={`pill pill-${lead.status.toLowerCase()}`}>{lead.status}</span>

            <h3>Investor profile</h3>
            <dl className="profile-list">
              <dt>Previous experience</dt><dd>{LABELS.previousExperience[lead.previousExperience]}</dd>
              <dt>Asset portfolio</dt><dd>{LABELS.assetPortfolio[lead.assetPortfolio]}</dd>
              <dt>Liquid capital</dt><dd>{LABELS.liquidCapital[lead.liquidCapital]}</dd>
              <dt>Intended investment</dt><dd>AED {Number(lead.intendedInvestment).toLocaleString()}</dd>
              <dt>Investment horizon</dt><dd>{LABELS.investmentHorizon[lead.investmentHorizon]}</dd>
              <dt>Investment objective</dt><dd>{LABELS.investmentObjective[lead.investmentObjective]}</dd>
            </dl>

            <h3>Consultant &amp; booking</h3>
            <p>{lead.agent?.name}{lead.booking ? ` · ${lead.booking.date} ${lead.booking.timeSlot} (locked)` : ' · not booked yet'}</p>

            <h3>Points awarded</h3>
            <ul className="plain-list">
              {lead.pointsLedger?.length
                ? lead.pointsLedger.map((p) => <li key={p.id}>{p.reason} — +{p.points} pts</li>)
                : <li className="muted">No points recorded yet</li>}
            </ul>

            {lead.reminders?.length > 0 && (
              <>
                <h3>Reminders</h3>
                <ul className="plain-list">
                  {lead.reminders.map((r) => (
                    <li key={r.id}>{r.channel} &middot; due {new Date(r.dueAt).toLocaleString()} &middot; {r.status}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
