import { Link } from 'react-router';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { mobilePaths } from './mobilePaths';
import WidgetScreen from './WidgetScreen';
import styles from './MobileLayout.module.scss';

function MissionsScreen() {
  return (
    <WidgetScreen
      widgetId="MissionsList"
      options={{ groupByStatus: true }}
      before={
        <div className={styles.toolbar}>
          <Link to={mobilePaths.newMission} className="btn primary small">
            <SymbolIcon name="add" /> New mission
          </Link>
        </div>
      }
    />
  );
}

export default MissionsScreen;
