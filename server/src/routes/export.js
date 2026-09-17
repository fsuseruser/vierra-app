const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

function toCsvRow(fields) {
  return fields.map((f) => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',');
}

router.get('/leads.csv', async (req, res, next) => {
  try {
    const { assetPortfolio, liquidCapital, investmentObjective, status } = req.query;
    const where = {};
    if (assetPortfolio) where.assetPortfolio = assetPortfolio;
    if (liquidCapital) where.liquidCapital = liquidCapital;
    if (investmentObjective) where.investmentObjective = investmentObjective;
    if (status) where.status = status;

    const leads = await prisma.lead.findMany({
      where,
      include: { agent: { select: { name: true } }, booking: true },
      orderBy: { createdAt: 'desc' }
    });

    const header = toCsvRow([
      'Name', 'Salutation', 'Phone', 'Email', 'Consultant', 'Status',
      'Previous Experience', 'Asset Portfolio', 'Liquid Capital',
      'Intended Investment (AED)', 'Investment Horizon', 'Investment Objective',
      'Booked Date', 'Booked Slot', 'Created At'
    ]);

    const rows = leads.map((l) => toCsvRow([
      l.fullName, l.salutation, l.phone, l.email, l.agent?.name, l.status,
      l.previousExperience, l.assetPortfolio, l.liquidCapital,
      l.intendedInvestment, l.investmentHorizon, l.investmentObjective,
      l.booking?.date, l.booking?.timeSlot, l.createdAt.toISOString()
    ]));

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vierra-leads.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
