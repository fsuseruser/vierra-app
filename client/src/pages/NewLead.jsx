import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import NavBar from '../components/NavBar.jsx';
import BookingGrid from '../components/BookingGrid.jsx';

const SALUTATIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Sheikh', 'Sheikha', 'Eng.'];

const OPTIONS = {
  previousExperience: [
    ['NO', 'No'], ['UAE', 'Yes — UAE'], ['INTERNATIONAL', 'Yes — International'], ['BOTH', 'Yes — Both UAE & International']
  ],
  assetPortfolio: [
    ['UNDER_1M', 'Under AED 1M'], ['R1_5M', 'AED 1M–5M'], ['R5_10M', 'AED 5M–10M'], ['R10_25M', 'AED 10M–25M'], ['OVER_25M', 'AED 25M+']
  ],
  liquidCapital: [
    ['UNDER_500K', 'Under AED 500K'], ['R500K_1M', 'AED 500K–1M'], ['R1_3M', 'AED 1M–3M'], ['R3_5M', 'AED 3M–5M'], ['OVER_5M', 'AED 5M+']
  ],
  investmentHorizon: [
    ['Y1_3', '1–3 years'], ['Y3_5', '3–5 years'], ['Y5_10', '5–10 years'], ['Y10_PLUS', '10+ years']
  ],
  investmentObjective: [
    ['CAPITAL_APPRECIATION', 'Capital appreciation'], ['RENTAL_YIELD', 'Rental income / yield'],
    ['SHORT_TERM_RESALE', 'Short-term resale'], ['LONG_TERM_WEALTH', 'Long-term wealth creation'],
    ['EQUITY_RELEASE', 'Equity release / portfolio expansion'], ['COMBINATION', 'Combination of the above']
  ]
};

function RadioGroup({ name, value, onChange, options }) {
  return (
    <div className="opts">
      {options.map(([val, label]) => (
        <label key={val} className={`opt ${value === val ? 'opt-selected' : ''}`}>
          <input type="radio" name={name} checked={value === val} onChange={() => onChange(val)} />
          {label}
        </label>
      ))}
    </div>
  );
}

const EMPTY_FORM = {
  salutation: 'Mr.', fullName: '', phone: '', email: '',
  previousExperience: '', assetPortfolio: '', liquidCapital: '',
  intendedInvestment: '', investmentHorizon: '', investmentObjective: ''
};

export default function NewLead() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.getSlots(date).then(setSlots).catch(() => setSlots([]));
    setSelectedSlot(null);
  }, [date]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Required';
    if (!/^\+?[0-9 ]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    ['previousExperience', 'assetPortfolio', 'liquidCapital', 'investmentHorizon', 'investmentObjective'].forEach((f) => {
      if (!form[f]) e[f] = 'Choose one';
    });
    if (!form.intendedInvestment || Number(form.intendedInvestment) <= 0) e.intendedInvestment = 'Enter an amount';
    if (!selectedSlot) e.slot = 'Pick a slot before confirming';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const lead = await api.createLead({ ...form, intendedInvestment: Number(form.intendedInvestment) });
      await api.createBooking({ leadId: lead.id, date, timeSlot: selectedSlot });
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message);
      api.getSlots(date).then(setSlots).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <NavBar active="New Lead" />
      <div className="page-body two-col">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h1>Investor profile</h1>
          <p className="muted">Answered by the consultant during the first conversation.</p>

          <div className="field">
            <label><span className="qnum">1 &middot; </span>Previous real estate investment experience</label>
            <RadioGroup name="q1" value={form.previousExperience} onChange={(v) => set('previousExperience', v)} options={OPTIONS.previousExperience} />
            {errors.previousExperience && <span className="field-error">{errors.previousExperience}</span>}
          </div>

          <div className="field">
            <label><span className="qnum">2 &middot; </span>Approximate value of current assets</label>
            <RadioGroup name="q2" value={form.assetPortfolio} onChange={(v) => set('assetPortfolio', v)} options={OPTIONS.assetPortfolio} />
            {errors.assetPortfolio && <span className="field-error">{errors.assetPortfolio}</span>}
          </div>

          <div className="field">
            <label><span className="qnum">3 &middot; </span>Available liquid capital for investment</label>
            <RadioGroup name="q3" value={form.liquidCapital} onChange={(v) => set('liquidCapital', v)} options={OPTIONS.liquidCapital} />
            {errors.liquidCapital && <span className="field-error">{errors.liquidCapital}</span>}
          </div>

          <div className="field">
            <label><span className="qnum">4 &middot; </span>Intended investment amount (AED)</label>
            <input type="number" min="0" value={form.intendedInvestment} onChange={(e) => set('intendedInvestment', e.target.value)} placeholder="e.g. 2500000" />
            {errors.intendedInvestment && <span className="field-error">{errors.intendedInvestment}</span>}
          </div>

          <div className="field">
            <label><span className="qnum">5 &middot; </span>Intended holding period</label>
            <RadioGroup name="q5" value={form.investmentHorizon} onChange={(v) => set('investmentHorizon', v)} options={OPTIONS.investmentHorizon} />
            {errors.investmentHorizon && <span className="field-error">{errors.investmentHorizon}</span>}
          </div>

          <div className="field">
            <label><span className="qnum">6 &middot; </span>Primary investment objective</label>
            <RadioGroup name="q6" value={form.investmentObjective} onChange={(v) => set('investmentObjective', v)} options={OPTIONS.investmentObjective} />
            {errors.investmentObjective && <span className="field-error">{errors.investmentObjective}</span>}
          </div>

          <hr />

          <div className="field">
            <label>Full name</label>
            <div className="row-inline">
              <select value={form.salutation} onChange={(e) => set('salutation', e.target.value)}>
                {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="e.g. Rashid Al Marri" />
            </div>
            {errors.fullName && <span className="field-error">{errors.fullName}</span>}
          </div>
          <div className="field">
            <label>Phone number</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971 5X XXX XXXX" />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>
          <div className="field">
            <label>Email address</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {formError && <div className="form-error">{formError}</div>}
        </form>

        <div className="card booking-card">
          <div className="booking-head">
            <h2>Book a slot</h2>
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <p className="muted">11:00 – 22:00, one-hour slots. Booked slots cannot be changed once confirmed.</p>
          <BookingGrid slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
          {errors.slot && <span className="field-error">{errors.slot}</span>}
          <div className="booking-footer">
            <span className="muted">{selectedSlot ? `Selected: ${date} ${selectedSlot}` : 'No slot selected yet'}</span>
            <button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : 'Confirm booking & save lead'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
