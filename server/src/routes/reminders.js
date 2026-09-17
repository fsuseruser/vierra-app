const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('TEAM_LEAD', 'ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const where = req.user.role === 'TEAM_LEAD' ? { teamLeadId: req.user.id } : {};

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        lead: {
          select: {
            fullName: true, phone: true, email: true,
            booking: true, agent: { select: { name: true } }
          }
        }
      },
      orderBy: { dueAt: 'asc' }
    });
    res.json(reminders);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { leadId, channel, dueAt } = req.body || {};
    if (!leadId || !channel || !dueAt) {
      return res.status(400).json({ error: 'leadId, channel and dueAt are required' });
    }
    if (!['WHATSAPP', 'EMAIL'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }
    const reminder = await prisma.reminder.create({
      data: { leadId, channel, dueAt: new Date(dueAt), teamLeadId: req.user.id }
    });
    res.status(201).json(reminder);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['PENDING', 'SENT', 'DONE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const reminder = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(reminder);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
