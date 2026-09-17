const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { awardPoints } = require('../lib/points');

const router = express.Router();
router.use(requireAuth);

const VALID_ENUMS = {
  previousExperience: ['NO', 'UAE', 'INTERNATIONAL', 'BOTH'],
  assetPortfolio: ['UNDER_1M', 'R1_5M', 'R5_10M', 'R10_25M', 'OVER_25M'],
  liquidCapital: ['UNDER_500K', 'R500K_1M', 'R1_3M', 'R3_5M', 'OVER_5M'],
  investmentHorizon: ['Y1_3', 'Y3_5', 'Y5_10', 'Y10_PLUS'],
  investmentObjective: [
    'CAPITAL_APPRECIATION', 'RENTAL_YIELD', 'SHORT_TERM_RESALE',
    'LONG_TERM_WEALTH', 'EQUITY_RELEASE', 'COMBINATION'
  ]
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone) {
  return /^\+?[0-9 ]{7,15}$/.test(phone);
}

router.post('/', requireRole('PROPERTY_CONSULTANT'), async (req, res, next) => {
  try {
    const {
      salutation, fullName, phone, email,
      previousExperience, assetPortfolio, liquidCapital,
      intendedInvestment, investmentHorizon, investmentObjective
    } = req.body || {};

    if (!salutation || !fullName || !phone || !email) {
      return res.status(400).json({ error: 'Salutation, full name, phone and email are required' });
    }
    if (!isValidPhone(phone)) return res.status(400).json({ error: 'Enter a valid phone number' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });

    for (const [field, options] of Object.entries(VALID_ENUMS)) {
      if (!options.includes(req.body[field])) {
        return res.status(400).json({ error: `Please choose an option for ${field}` });
      }
    }
    const amount = Number(intendedInvestment);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Enter a valid investment amount' });

    const lead = await prisma.lead.create({
      data: {
        salutation, fullName, phone, email,
        previousExperience, assetPortfolio, liquidCapital,
        intendedInvestment: amount, investmentHorizon, investmentObjective,
        agentId: req.user.id
      }
    });

    await awardPoints(req.user.id, lead.id, 'SUBMITTED');

    res.status(201).json(lead);
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { agentId, assetPortfolio, liquidCapital, investmentObjective, status } = req.query;
    let where = {};

    if (req.user.role === 'PROPERTY_CONSULTANT') {
      where.agentId = req.user.id;
    } else if (req.user.role === 'TEAM_LEAD') {
      const myConsultants = await prisma.user.findMany({
        where: { supervisorId: req.user.id, role: 'PROPERTY_CONSULTANT' },
        select: { id: true }
      });
      where.agentId = { in: myConsultants.map((c) => c.id) };
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not allowed' });
    }

    if (agentId && req.user.role === 'ADMIN') where.agentId = agentId;
    if (assetPortfolio) where.assetPortfolio = assetPortfolio;
    if (liquidCapital) where.liquidCapital = liquidCapital;
    if (investmentObjective) where.investmentObjective = investmentObjective;
    if (status) where.status = status;

    const leads = await prisma.lead.findMany({
      where,
      include: { agent: { select: { name: true } }, booking: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        agent: { select: { id: true, name: true } },
        booking: true,
        pointsLedger: { orderBy: { createdAt: 'asc' } },
        reminders: { orderBy: { dueAt: 'asc' } }
      }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (req.user.role === 'PROPERTY_CONSULTANT' && lead.agentId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (req.user.role === 'TEAM_LEAD') {
      const owner = await prisma.user.findUnique({ where: { id: lead.agentId } });
      if (!owner || owner.supervisorId !== req.user.id) {
        return res.status(403).json({ error: 'Not allowed' });
      }
    }

    res.json(lead);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', requireRole('PROPERTY_CONSULTANT', 'TEAM_LEAD', 'ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['QUALIFIED', 'CONVERTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const data = { status };
    if (status === 'QUALIFIED') data.qualifiedAt = new Date();
    if (status === 'CONVERTED') data.convertedAt = new Date();

    const updated = await prisma.lead.update({ where: { id: lead.id }, data });

    if (status === 'QUALIFIED') await awardPoints(lead.agentId, lead.id, 'QUALIFIED');
    if (status === 'CONVERTED') await awardPoints(lead.agentId, lead.id, 'CONVERTED');

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
