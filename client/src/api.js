const BASE = '/api';

function getToken() {
  return localStorage.getItem('vierra_token');
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 204) return null;

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error((data && data.error) || 'Something went wrong');
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),

  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  listUsers: () => request('/users'),
  leaderboard: () => request('/users/leaderboard'),

  createLead: (payload) => request('/leads', { method: 'POST', body: payload }),
  listLeads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/leads' + (qs ? `?${qs}` : ''));
  },
  getLead: (id) => request(`/leads/${id}`),
  updateLeadStatus: (id, status) => request(`/leads/${id}/status`, { method: 'PATCH', body: { status } }),

  getSlots: (date) => request(`/bookings/slots?date=${date}`),
  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }),

  listReminders: () => request('/reminders'),
  createReminder: (payload) => request('/reminders', { method: 'POST', body: payload }),
  updateReminder: (id, status) => request(`/reminders/${id}`, { method: 'PATCH', body: { status } }),

  weeklyGoal: (agentId) => request('/goals/weekly' + (agentId ? `?agentId=${agentId}` : '')),

  listTeamLeads: () => request('/users/team-leads'),

  weekBookings: (start) => request(`/bookings/week?start=${start}`),

  googleStatus: () => request('/integrations/google/status'),
  disconnectGoogle: () => request('/integrations/google/disconnect', { method: 'POST' }),

  technicalOverview: () => request('/technical/overview'),
  technicalUsers: () => request('/technical/users'),

  // A plain <a href> never sends the Authorization header, which is exactly
  // why "Export CSV" said "not authenticated" — fetch it with the header
  // instead and hand the browser a blob to download.
  downloadLeadsCsv: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(BASE + '/export/leads.csv' + (qs ? `?${qs}` : ''), {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vierra-leads.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

export function getStoredUser() {
  const raw = localStorage.getItem('vierra_user');
  return raw ? JSON.parse(raw) : null;
}

export function storeSession(token, user) {
  localStorage.setItem('vierra_token', token);
  localStorage.setItem('vierra_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('vierra_token');
  localStorage.removeItem('vierra_user');
}
