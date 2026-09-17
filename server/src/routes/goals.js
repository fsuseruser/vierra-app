const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Weekly targets are computed live from Lead.qualifiedAt, grouped by
// ISO week, rather than stored as a running total — this is what makes
// "reset every week" and "see last week too" work without a cron job.
router.get('/weekly', async (req, res, next) => {
  try {
    const agentId = req.query.agentId || req.user.id;
    if (req.user.role === 'PROPERTY_CONSULTANT' && agentId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const thisWeekStart = startOfWeek(new Date());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const [thisWeek, lastWeek] = await Promise.all([
      prisma.lead.count({
        where: { agentId, status: { in: ['QUALIFIED', 'CONVERTED'] }, qualifiedAt: { gte: thisWeekStart } }
      }),
      prisma.lead.count({
        where: { agentId, status: { in: ['QUALIFIED', 'CONVERTED'] }, qualifiedAt: { gte: lastWeekStart, lt: thisWeekStart } }
      })
    ]);

    res.json({ target: 10, thisWeek, lastWeek });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
