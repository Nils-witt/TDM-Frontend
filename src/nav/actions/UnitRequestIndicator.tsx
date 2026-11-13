import { useState } from 'react';
import { fmsStatusLabels, unitLabel } from '@/api/units';
import { NotificationsIcon } from '@/components/icons.tsx';
import Menu from '@/components/menu/Menu.tsx';
import MenuItem from '@/components/menu/MenuItem.tsx';
import MenuSeparator from '@/components/menu/MenuSeparator.tsx';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import FmsBadge from '@/pages/dashboard/widgets/shared/FmsBadge';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import AcknowledgeRequestDialog from '@/pages/dashboard/widgets/UnitRequests/AcknowledgeRequestDialog';
import {
  type UnitRequestRow,
  unitRequestKey,
  useUnitRequests,
} from '@/pages/dashboard/widgets/UnitRequests/unitRequests';
import styles from './UnitRequestIndicator.module.scss';

// The units' pending FMS 0, 5 and 9 requests: hidden without a units server,
// highlighted while one is pending (an urgent 0 in red). Its menu
// acknowledges them one by one, each after a confirmation.
function UnitRequestIndicator() {
  const state = useUnitRequests();
  const { openWidget } = useWidgetWindows();
  const [confirming, setConfirming] = useState<UnitRequestRow | null>(null);
  if (!state.enabled) return null;

  const { pending } = state;
  const urgent = pending.some((r) => r.request.code === 0);
  const level = urgent ? styles.urgent : pending.length > 0 ? styles.pending : styles.none;
  const title =
    pending.length === 0
      ? 'No pending unit requests'
      : `${pending.length} pending unit request${pending.length === 1 ? '' : 's'}`;

  return (
    <>
      <Menu
        trigger={
          <span className={styles.trigger}>
            <NotificationsIcon />
            {pending.length > 0 && <span className={styles.count}>{pending.length}</span>}
          </span>
        }
        className={`${styles.indicator} ${level}`}
        label={title}
        title={title}
      >
        <div className={styles.details}>
          <div className={styles.heading}>{title}</div>
          {!state.connected && (
            <div className={styles.error}>Not connected to the units server.</div>
          )}
          {state.error !== null && <div className={styles.error}>{state.error}</div>}
        </div>
        {pending.length > 0 && (
          <div className={styles.requests}>
            {pending.map((r) => (
              <MenuItem
                key={unitRequestKey(r)}
                keepOpen
                icon={<FmsBadge code={r.request.code} />}
                title={`${fmsStatusLabels[r.request.code]}: click to acknowledge`}
                disabled={!state.canAcknowledge || state.acknowledging === unitRequestKey(r)}
                trailing={
                  <span className={styles.muted}>{formatTime(r.request.at)} · Acknowledge</span>
                }
                onClick={() => setConfirming(r)}
              >
                {unitLabel(r.unit)}
              </MenuItem>
            ))}
          </div>
        )}
        <MenuSeparator />
        <MenuItem onClick={() => openWidget('UnitRequests')}>Show in Window</MenuItem>
      </Menu>
      {confirming && (
        <AcknowledgeRequestDialog
          row={confirming}
          onAcknowledge={state.acknowledge}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}

export default UnitRequestIndicator;
