import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { type MedicalCategory, useMedicalCategories } from '@/api/medicalCategories';
import { type UhsStatisticsEntry, useUhsStatistics } from '@/api/uhsStatistics';
import { FormError, SectionHeading, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import tableStyles from '../shared/CatalogManager.module.scss';
import WidgetActionBar, { WidgetAction, WidgetActionSelect } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import HourBars from './HourBars';
import StackedBar, { TriageLegend } from './StackedBar';
import {
  formatMinutes,
  medicalRows,
  statisticsWindows,
  totalsOf,
  windowHours,
} from './uhsStatistics';
import styles from './UhsStatistics.module.scss';

const noCategories: readonly MedicalCategory[] = [];

// The session scope's UHS: an overview with a row per UHS and the totals, or
// the details of one (or of all together). The hours and uhsId options are
// what it starts with; the selects in its bar switch them in place. Online
// only, like the patients it counts.
function UhsStatistics({ options }: WidgetProps) {
  const offline = useOffline();
  // null follows the option until a select picks another.
  const [pickedHours, setHours] = useState<number | null>(null);
  const [pickedUhs, setUhs] = useState<string | null>(null);
  const hours = pickedHours ?? windowHours(options.hours);
  const chosen = pickedUhs ?? String(options.uhsId ?? '');
  const stats = useUhsStatistics(offline ? null : hours);
  const categories = useMedicalCategories().data ?? noCategories;

  const entries = stats.data?.uhs ?? [];
  // All together: the totals' details.
  const detail = chosen === 'all' ? totalsOf(entries) : entries.find((e) => e.uhs === chosen);

  const actions = (
    <WidgetActionBar label="UHS statistics actions">
      <WidgetActionSelect
        aria-label="Time window"
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
      >
        {statisticsWindows.map((w) => (
          <option key={w.value} value={w.value}>
            {w.label}
          </option>
        ))}
      </WidgetActionSelect>
      <WidgetActionSelect
        aria-label="UHS"
        value={detail ? chosen : ''}
        onChange={(e) => setUhs(e.target.value)}
      >
        <option value="">Overview</option>
        <option value="all">All UHS together</option>
        {entries.map((e) => (
          <option key={e.uhs} value={e.uhs}>
            {e.name}
            {e.active ? '' : ' (inactive)'}
          </option>
        ))}
      </WidgetActionSelect>
      {detail && <WidgetAction onClick={() => setUhs('')}>Overview</WidgetAction>}
    </WidgetActionBar>
  );

  if (offline) return <EmptyState>Statistics are not available offline.</EmptyState>;
  if (stats.data === undefined) {
    return (
      <>
        {actions}
        {stats.error === null ? (
          <Spinner compact />
        ) : (
          <FormError error={stats.error} onClose={() => void stats.reload()} />
        )}
      </>
    );
  }

  return (
    <div className={sectionStack}>
      {actions}
      {entries.length === 0 ? (
        <EmptyState className="">This scope has no UHS.</EmptyState>
      ) : detail ? (
        <Detail entry={detail} hours={hours} categories={categories} />
      ) : (
        <Overview entries={entries} hours={hours} onPick={setUhs} />
      )}
      <FormError error={stats.error} onClose={() => void stats.reload()} />
    </div>
  );
}

const windowLabel = (hours: number) =>
  statisticsWindows.find((w) => w.value === hours)?.label.toLowerCase() ?? `last ${hours} h`;

function Overview({
  entries,
  hours,
  onPick,
}: {
  entries: readonly UhsStatisticsEntry[];
  hours: number;
  onPick: (uhs: string) => void;
}) {
  const totals = totalsOf(entries);
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <caption className={tableStyles.hidden}>
          Patients now and stays in the {windowLabel(hours)}
        </caption>
        <thead>
          <tr>
            <th>UHS</th>
            <th className={styles.number} title="Arrived / inbound">
              Now
            </th>
            <th>Triage</th>
            <th className={styles.number}>Admitted</th>
            <th className={styles.number}>Checked out</th>
            <th className={styles.number}>Moved</th>
            <th className={styles.number}>Removed</th>
            <th className={styles.number}>Transports</th>
            <th className={styles.number} title="Mean arrival to checkout">
              Ø Stay
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <Row key={e.uhs} entry={e} onPick={() => onPick(e.uhs)} />
          ))}
          <Row entry={totals} totals onPick={() => onPick('all')} />
        </tbody>
      </table>
    </div>
  );
}

function Row({
  entry: e,
  totals,
  onPick,
}: {
  entry: UhsStatisticsEntry;
  totals?: boolean;
  onPick: () => void;
}) {
  const classes = [
    styles.clickable,
    totals ? styles.totals : '',
    e.active ? '' : tableStyles.dimmed,
  ];
  return (
    <tr
      className={classes.filter(Boolean).join(' ')}
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onPick();
        }
      }}
    >
      <td>
        {totals ? 'Total' : e.name}
        {!e.active && ' (inactive)'}
      </td>
      <td
        className={styles.number}
        title={`${e.current.arrived} arrived, ${e.current.inbound} inbound`}
      >
        {e.current.arrived} / {e.current.inbound}
      </td>
      <td>
        <StackedBar counts={e.current.critical} />
      </td>
      <td className={styles.number}>{e.window.admitted}</td>
      <td className={styles.number}>{e.window.checked_out}</td>
      <td className={styles.number}>{e.window.moved_out}</td>
      <td className={styles.number}>{e.window.removed}</td>
      <td className={styles.number}>{e.window.transports}</td>
      <td className={styles.number}>{formatMinutes(e.window.avg_stay_minutes)}</td>
    </tr>
  );
}

function Detail({
  entry: e,
  hours,
  categories,
}: {
  entry: UhsStatisticsEntry;
  hours: number;
  categories: readonly MedicalCategory[];
}) {
  const medical = medicalRows(e.current.medical, categories);
  const maxMedical = Math.max(1, ...medical.map((m) => m.count));
  return (
    <>
      <section>
        <SectionHeading>
          {e.name}
          {e.active ? '' : ' (inactive)'}: now
        </SectionHeading>
        <dl className={styles.figures}>
          <Figure label="Patients" value={e.current.total} />
          <Figure label="Arrived" value={e.current.arrived} />
          <Figure label="Inbound" value={e.current.inbound} />
        </dl>
      </section>
      <section>
        <SectionHeading>Triage</SectionHeading>
        <StackedBar counts={e.current.critical} />
        <TriageLegend counts={e.current.critical} />
      </section>
      <section>
        <SectionHeading>Medical categories</SectionHeading>
        {medical.length === 0 ? (
          <EmptyState className="">No patients.</EmptyState>
        ) : (
          <dl className={styles.hbars}>
            {medical.map((m) => (
              <div key={m.key} className={styles.hbarRow}>
                <dt title={m.label}>{m.label}</dt>
                <dd>
                  <span className={styles.hbarTrack}>
                    <span
                      className={styles.hbar}
                      style={{ width: `${(m.count / maxMedical) * 100}%` }}
                    />
                  </span>
                  <span className={styles.number}>{m.count}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section>
        <SectionHeading>{windowLabel(hours).replace(/^l/, 'L')}</SectionHeading>
        <dl className={styles.figures}>
          <Figure label="Admitted" value={e.window.admitted} />
          <Figure label="Checked out" value={e.window.checked_out} />
          <Figure label="Moved out" value={e.window.moved_out} />
          <Figure label="Removed" value={e.window.removed} />
          <Figure label="Transports" value={e.window.transports} />
          <Figure label="Ø Stay" value={formatMinutes(e.window.avg_stay_minutes)} />
        </dl>
      </section>
      <section>
        <SectionHeading>Arrivals per hour</SectionHeading>
        <HourBars hours={e.window.arrivals_per_hour} />
      </section>
    </>
  );
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.figure}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default UhsStatistics;
