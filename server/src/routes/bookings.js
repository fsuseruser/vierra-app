const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ALL_SLOTS, isSlotInPast, slotStartHour } = require('../lib/slots');

const router = express.Router();
router.use(requireAuth);

router.get('/slots', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    const taken = await prisma.booking.findMany({ where: { date }, select: { timeSlot: true } });
    const takenSet = new Set(taken.map((b) => b.timeSlot));

    res.json(ALL_SLOTS.map((slot) => ({
      slot,
      available: !takenSet.has(slot) && !isSlotInPast(date, slot)
    })));
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { leadId, date, timeSlot } = req.body || {};
    if (!leadId || !date || !timeSlot) {
      return res.status(400).json({ error: 'leadId, date and timeSlot are required' });
    }
    if (!ALL_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ error: 'Invalid time slot' });
    }
    if (isSlotInPast(date, timeSlot)) {
      return res.status(400).json({ error: 'That date and time has already passed — pick a future slot' });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { agent: { select: { id: true, supervisorId: true } } }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    let booking;
    try {
      booking = await prisma.booking.create({
        data: { leadId, date, timeSlot, agentId: lead.agentId }
      });
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'That slot was just booked by someone else — pick another.' });
      }
      throw e;
    }

    // Auto-create the follow-up reminder for the consultant's Team Lead —
    // without this, the Team Lead's reminder queue never gets anything in it.
    if (lead.agent.supervisorId) {
      const [y, m, d] = date.split('-').map(Number);
      const dueAt = new Date(y, m - 1, d, slotStartHour(timeSlot), 0, 0);
      dueAt.setHours(dueAt.getHours() - 2); // due 2 hours before the appointment

      await prisma.reminder.create({
        data: {
          leadId,
          teamLeadId: lead.agent.supervisorId,
          channel: 'WHATSAPP',
          dueAt
        }
      });
    }

    res.status(201).json(booking);
  } catch (e) {
    next(e);
  }
});

// Weekly calendar view (Admin sees everyone, Team Lead sees their own consultants).
router.get('/week', requireRole('ADMIN', 'TEAM_LEAD'), async (req, res, next) => {
  try {
    const { start } = req.query;
    if (!start) return res.status(400).json({ error: 'start (Monday, YYYY-MM-DD) is required' });

    const [y, m, d] = start.split('-').map(Number);
    const startDate = new Date(y, m - 1, d);
    const dates = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + i);
      return dt.toISOString().slice(0, 10);
    });

    let agentFilter = {};
    if (req.user.role === 'TEAM_LEAD') {
      const myConsultants = await prisma.user.findMany({
        where: { supervisorId: req.user.id, role: 'PROPERTY_CONSULTANT' },
        select: { id: true }
      });
      agentFilter = { agentId: { in: myConsultants.map((c) => c.id) } };
    }

    const bookings = await prisma.booking.findMany({
      where: { date: { in: dates }, ...agentFilter },
      include: {
        agent: { select: { name: true } },
        lead: { select: { fullName: true, salutation: true, status: true } }
      }
    });

    res.json({ dates, bookings });
  } catch (e) {
    next(e);
  }
});

// Intentionally no PATCH or DELETE route here: once booked, a slot is permanent.

module.exports = router;
