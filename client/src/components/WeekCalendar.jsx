import { Fragment } from 'react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function toSlot(hour) {
  return `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:00`;
}

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function WeekCalendar({ weekStart, dates, bookings, onPrevWeek, onNextWeek }) {
  const byKey = {};
  bookings.forEach((b) => {
    byKey[`${b.date}|${b.timeSlot}`] = b;
  });

  const rangeLabel = dates.length
    ? `${dates[0]} – ${dates[6]}`
    : '';

  return (
    <div className="week-calendar">
      <div className="week-calendar-head">
        <button type="button" className="btn-ghost" onClick={onPrevWeek}>&larr; Previous</button>
        <span className="muted">{rangeLabel}</span>
        <button type="button" className="btn-ghost" onClick={onNextWeek}>Next &rarr;</button>
      </div>
      <div className="week-grid">
        <div className="week-grid-corner" />
        {DAY_LABELS.map((label, i) => (
          <div className="week-grid-day-head" key={label}>
            <div>{label}</div>
            <div className="week-grid-date">{dates[i]?.slice(5)}</div>
          </div>
        ))}

        {HOURS.map((hour) => (
          <Fragment key={`row-${hour}`}>
            <div className="week-grid-time">{String(hour).padStart(2, '0')}:00</div>
            {dates.map((date) => {
              const slot = toSlot(hour);
              const booking = byKey[`${date}|${slot}`];
              return (
                <div
                  key={`${date}-${hour}`}
                  className={`week-grid-cell ${booking ? 'week-grid-cell-booked' : ''}`}
                  title={booking ? `${booking.lead.salutation} ${booking.lead.fullName} · ${booking.agent.name}` : ''}
                >
                  {booking && (
                    <>
                      <div className="week-grid-cell-name">{booking.lead.fullName}</div>
                      <div className="week-grid-cell-agent">{booking.agent.name}</div>
                    </>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export { mondayOf };
