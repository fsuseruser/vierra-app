export default function BookingGrid({ slots, selected, onSelect }) {
  return (
    <div className="booking-grid">
      {slots.map(({ slot, available }) => (
        <button
          key={slot}
          type="button"
          disabled={!available}
          className={`slot ${!available ? 'slot-booked' : selected === slot ? 'slot-selected' : ''}`}
          onClick={() => onSelect(slot)}
        >
          {slot}
        </button>
      ))}
      {slots.length === 0 && <p className="muted">Pick a date to see available slots.</p>}
    </div>
  );
}
