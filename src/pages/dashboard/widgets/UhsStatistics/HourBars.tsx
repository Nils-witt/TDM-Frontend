import type { Timestamp } from '@/api/entity';
import styles from './UhsStatistics.module.scss';

const hourLabel = (ts: Timestamp) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// SVG units; the chart scales to the widget's width.
const width = 600;
const height = 120;
const axis = 16;

// Arrivals per hour as columns, with an hour label every few columns so they
// do not overlap.
function HourBars({ hours }: { hours: readonly { hour: Timestamp; count: number }[] }) {
  if (hours.length === 0) return null;
  const max = Math.max(1, ...hours.map((h) => h.count));
  const step = width / hours.length;
  const labelEvery = Math.ceil(hours.length / 8);
  const total = hours.reduce((n, h) => n + h.count, 0);
  return (
    <svg
      className={styles.hours}
      viewBox={`0 0 ${width} ${height + axis}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${total} arrivals in ${hours.length} hours, at most ${max} in one hour`}
    >
      <line x1={0} x2={width} y1={height} y2={height} />
      {hours.map((h, i) => {
        const barHeight = (h.count / max) * (height - 4);
        return (
          <g key={h.hour}>
            {h.count > 0 && (
              <rect
                x={i * step + step * 0.15}
                y={height - barHeight}
                width={step * 0.7}
                height={barHeight}
              >
                <title>
                  {hourLabel(h.hour)}: {h.count}
                </title>
              </rect>
            )}
            {i % labelEvery === 0 && (
              <text x={i * step + step / 2} y={height + axis - 3} textAnchor="middle">
                {hourLabel(h.hour)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default HourBars;
