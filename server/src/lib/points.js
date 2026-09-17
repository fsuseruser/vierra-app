const prisma = require('./prisma');

const POINTS = {
  SUBMITTED: 10,
  QUALIFIED: 50,
  CONVERTED: 100
};

async function awardPoints(agentId, leadId, reason) {
  const points = POINTS[reason];
  if (!points) throw new Error('Unknown points reason: ' + reason);

  await prisma.$transaction([
    prisma.pointsLedger.create({
      data: { agentId, leadId, points, reason }
    }),
    prisma.user.update({
      where: { id: agentId },
      data: { points: { increment: points } }
    })
  ]);
}

module.exports = { awardPoints, POINTS };
