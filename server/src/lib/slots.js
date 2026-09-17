const SLOT_START_HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function slotLabel(hour) {
  const start = String(hour).padStart(2, '0') + ':00';
  const end = String(hour + 1).padStart(2, '0') + ':00';
  return `${start}-${end}`;
}

const ALL_SLOTS = SLOT_START_HOURS.map(slotLabel);

// The hour (24h) a slot starts at, e.g. "14:00-15:00" -> 14
function slotStartHour(slot) {
  return parseInt(slot.split(':')[0], 10);
}

// True if this date + slot has already started, relative to "now".
function isSlotInPast(dateStr, slot, now = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startHour = slotStartHour(slot);
  const slotStart = new Date(y, m - 1, d, startHour, 0, 0);
  return slotStart.getTime() <= now.getTime();
}

module.exports = { ALL_SLOTS, SLOT_START_HOURS, slotLabel, slotStartHour, isSlotInPast };
