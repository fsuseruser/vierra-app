// Simple SVG donut built from stroke-dasharray segments — no dependency.
export default function DonutChart({ data, colors, size = 140, thickness = 20 }) {
  const palette = colors || ['#1F5C58', '#E9C46A', '#B45309', '#4A3F7A', '#2F6B3A', '#A13D3D'];
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const seg = {
      color: palette[i % palette.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
      label: d.label,
      value: d.value
    };
    offset += dash;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EFEBE2" strokeWidth={thickness} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
      </svg>
      <div className="donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="donut-legend-row">
            <span className="donut-swatch" style={{ background: s.color }} />
            <span className="donut-legend-label">{s.label}</span>
            <span className="donut-legend-value">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
