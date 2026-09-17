const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Admin can create TEAM_LEAD, PROPERTY_CONSULTANT or TECHNICAL.
// Team Lead can only create PROPERTY_CONSULTANT, and it's auto-assigned to them.
router.post('/', requireRole('ADMIN', 'TEAM_LEAD'), async (req, res, next) => {
  try {
    const { name, email, password, role, supervisorId } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }
    if (req.user.role === 'TEAM_LEAD' && role !== 'PROPERTY_CONSULTANT') {
      return res.status(403).json({ error: 'Team Leads can only create Property Consultants' });
    }
    if (!['TEAM_LEAD', 'PROPERTY_CONSULTANT', 'TECHNICAL'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Every Property Consultant needs a real supervisor, or they'd be
    // invisible to any Team Lead's dashboard and reminder queue.
    let resolvedSupervisorId = null;
    if (role === 'PROPERTY_CONSULTANT') {
      if (req.user.role === 'TEAM_LEAD') {
        resolvedSupervisorId = req.user.id;
      } else {
        if (!supervisorId) {
          return res.status(400).json({ error: 'Choose which Team Lead this consultant reports to' });
        }
        const teamLead = await prisma.user.findUnique({ where: { id: supervisorId } });
        if (!teamLead || teamLead.role !== 'TEAM_LEAD') {
          return res.status(400).json({ error: 'Selected supervisor is not a valid Team Lead' });
        }
        resolvedSupervisorId = supervisorId;
      }
    }

    const emailLower = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) return res.status(409).json({ error: 'That email is already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: emailLower,
        passwordHash,
        role,
        createdById: req.user.id,
        supervisorId: resolvedSupervisorId
      }
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) {
    next(e);
  }
});

// List users this account can see/manage
router.get('/', async (req, res, next) => {
  try {
    let where;
    if (req.user.role === 'ADMIN') {
      where = { role: { in: ['TEAM_LEAD', 'PROPERTY_CONSULTANT', 'TECHNICAL'] } };
    } else if (req.user.role === 'TEAM_LEAD') {
      where = { supervisorId: req.user.id, role: 'PROPERTY_CONSULTANT' };
    } else {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, points: true, createdAt: true,
        googleConnectedAt: true,
        supervisor: { select: { name: true } },
        _count: { select: { leads: true } }
      },
      orderBy: { points: 'desc' }
    });

    res.json(users);
  } catch (e) {
    next(e);
  }
});

// Used by Admin's "create consultant" form to pick a supervisor.
router.get('/team-leads', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const teamLeads = await prisma.user.findMany({
      where: { role: 'TEAM_LEAD' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    res.json(teamLeads);
  } catch (e) {
    next(e);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const consultants = await prisma.user.findMany({
      where: { role: 'PROPERTY_CONSULTANT' },
      select: { id: true, name: true, points: true },
      orderBy: { points: 'desc' },
      take: 10
    });
    res.json(consultants);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
