const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('TECHNICAL', 'ADMIN'));

// Deliberately no lead/investor PII here — Technical is an ops/support role,
// not a sales-data role, so it only gets system-health style numbers.
router.get('/overview', async (req, res, next) => {
  try {
    const [totalUsers, totalConsultants, totalTeamLeads, totalLeads, totalBookings, pendingReminders, googleConnected] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'PROPERTY_CONSULTANT' } }),
        prisma.user.count({ where: { role: 'TEAM_LEAD' } }),
        prisma.lead.count(),
        prisma.booking.count(),
        prisma.reminder.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { googleConnectedAt: { not: null } } })
      ]);

    res.json({ totalUsers, totalConsultants, totalTeamLeads, totalLeads, totalBookings, pendingReminders, googleConnected });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, googleConnectedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
