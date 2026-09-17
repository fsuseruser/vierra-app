import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, storeSession } from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      storeSession(token, user);
      if (user.role === 'PROPERTY_CONSULTANT') navigate('/dashboard');
      else if (user.role === 'TEAM_LEAD') navigate('/team-lead');
      else if (user.role === 'TECHNICAL') navigate('/technical');
      else navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-panel-glow" />
        <div className="login-panel-content">
          <img src="/vierra-logo-white.png" alt="Vierra" className="login-logo" />
          <p className="login-tagline">Grow. Invest. Manage.</p>
          <h1>Every investor,<br />qualified and<br />tracked.</h1>
          <p className="login-copy">
            One place to capture investor profiles, book consultations, and watch
            your points grow — built for how Vierra actually works.
          </p>
        </div>
        <span className="login-footer">Internal tool &middot; Vierra Property Brokers</span>
      </div>
      <div className="login-form-wrap">
        <form onSubmit={handleSubmit} className="login-form">
          <span className="login-form-eyebrow">Welcome back</span>
          <h2>Sign in</h2>
          <label>Work email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <p className="login-hint">Accounts are created by your Admin or Team Lead — there's no self sign-up.</p>
        </form>
      </div>
    </div>
  );
}
