import { SectionText } from '@/components/form';
import { useLayoutView } from '../layoutContext';
import MonitorArrangement from './MonitorArrangement';
import { widgetCount } from './monitors';
import styles from './Monitors.module.scss';

function MonitorPicker() {
  const { active, chooseMonitor } = useLayoutView();

  return (
    <div className={styles.screen}>
      <div className={`card ${styles.picker}`}>
        <h2>Which monitor is this window?</h2>
        <SectionText>
          <span className="muted">
            “{active.name}” spans {active.monitors.length} monitors. Pick the one this window is on
            to show its widgets here.
          </span>
        </SectionText>
        <div className={styles.canvas}>
          <MonitorArrangement
            monitors={active.monitors}
            onSelect={chooseMonitor}
            detail={widgetCount}
            channels={active.channels}
            label="Monitors"
          />
        </div>
      </div>
    </div>
  );
}

export default MonitorPicker;
