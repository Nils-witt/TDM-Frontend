import { useNavigate } from 'react-router';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { type NavAction, useNavActions } from '@/nav/navActions';
import { mobilePaths } from './mobilePaths';
import WidgetScreen from './WidgetScreen';
import styles from './MobileLayout.module.scss';

// The Missions menu's actions that make sense on a phone; reports are made at
// a desk.
const actions: { action: NavAction; label: string }[] = [
  { action: 'saveMission', label: 'Save' },
  { action: 'clearMission', label: 'Clear' },
  { action: 'closeMission', label: 'Close' },
  { action: 'printMission', label: 'Interim report' },
];

// Shows the selected mission, or creates one on /missions/new; going back keeps
// the selection for the other tabs.
function MissionScreen() {
  const navigate = useNavigate();
  const { run, disabled } = useNavActions();
  return (
    <WidgetScreen
      widgetId="MissionDetails"
      before={
        <div className={styles.toolbar} role="toolbar" aria-label="Mission">
          <button
            type="button"
            className="icon-btn"
            aria-label="Missions"
            onClick={() => void navigate(mobilePaths.missions)}
          >
            <SymbolIcon name="arrow_back" />
          </button>
          {actions.map(({ action, label }) => (
            <button
              key={action}
              type="button"
              className="btn small"
              disabled={disabled(action)}
              onClick={() => run(action)}
            >
              {label}
            </button>
          ))}
        </div>
      }
    />
  );
}

export default MissionScreen;
