// A small, self-contained horizontal bar chart. No charting library —
// just SVG rects sized from the data, so it stays exactly on-brand.
export default function BarChart({ data, colors }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const palette = colors || ['#1F5C58', '#E9C46A', '#2F6B3A', '#A13D3D', '#4A3F7A', '#B45309'];

  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: palette[i % palette.length] }}
            />
          </div>
          <span className="bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
