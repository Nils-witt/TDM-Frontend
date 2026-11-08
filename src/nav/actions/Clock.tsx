import { useEffect, useState } from 'react';
import styles from './Clock.module.scss';

const clockFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// Tactical date-time group, DDHHMMMONYY in local time, with the English month
// abbreviation whatever the locale.
const tacticalMonth = new Intl.DateTimeFormat('en-US', { month: 'short' });
const pad = (n: number) => n.toString().padStart(2, '0');

const tacticalClockFormat = (now: Date) =>
  pad(now.getDate()) +
  pad(now.getHours()) +
  pad(now.getMinutes()) +
  tacticalMonth.format(now).toUpperCase() +
  pad(now.getFullYear() % 100);

type ClockType = 'digital' | 'tactical';

// Updates at the start of every second; a click switches between the digital
// and tactical format.
function Clock() {
  const [now, setNow] = useState(() => new Date());
  const [type, setType] = useState<ClockType>('digital');

  useEffect(() => {
    let timer: number;
    const tick = () => {
      const date = new Date();
      setNow(date);
      timer = window.setTimeout(tick, 1000 - (date.getTime() % 1000));
    };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      className={styles.clock}
      data-tour="clock"
      aria-label="Toggle clock format"
      onClick={() => setType((t) => (t === 'digital' ? 'tactical' : 'digital'))}
    >
      <time dateTime={now.toISOString()} title={now.toLocaleString()}>
        {type === 'digital' ? clockFormat.format(now).replace(/,/g, '') : tacticalClockFormat(now)}
      </time>
    </button>
  );
}

export default Clock;
