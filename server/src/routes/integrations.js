const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

function frontendUrl(path) {
  const base = process.env.FRONTEND_URL || '';
  return base + path;
}

// GET /api/integrations/google/status
router.get('/google/status', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { googleConnectedAt: true }
    });
    res.json({
      configured: isGoogleConfigured(),
      connected: Boolean(user?.googleConnectedAt),
      connectedAt: user?.googleConnectedAt || null
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/integrations/google/connect
// This is a real browser navigation (not a fetch call) — clicking the
// "Link Google Calendar" button should send the whole page here.
router.get('/google/connect', requireAuth, (req, res) => {
  if (!isGoogleConfigured()) {
    // Nothing happened before because there was no backend route AND no
    // Google credentials configured. This at least explains why, instead
    // of the button silently doing nothing.
    return res.redirect(frontendUrl('/admin/team?google=not_configured'));
  }

  // Short-lived state token carries which user is connecting, since Google's
  // redirect back to our callback has no session/cookie to identify them.
  const state = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '10m' });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// GET /api/integrations/google/callback
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(frontendUrl(`/admin/team?google=error`));
    if (!code || !state) return res.redirect(frontendUrl('/admin/team?google=error'));

    let payload;
    try {
      payload = jwt.verify(state, process.env.JWT_SECRET);
    } catch (e) {
      return res.redirect(frontendUrl('/admin/team?google=error'));
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error('Google token exchange failed:', tokenData);
      return res.redirect(frontendUrl('/admin/team?google=error'));
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { googleRefreshToken: tokenData.refresh_token, googleConnectedAt: new Date() }
    });

    res.redirect(frontendUrl('/admin/team?google=connected'));
  } catch (e) {
    next(e);
  }
});

router.post('/google/disconnect', requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { googleRefreshToken: null, googleConnectedAt: null }
    });
    res.json({ connected: false });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
