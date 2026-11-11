import { useSearchParams } from 'react-router';
import EmbeddedWidget from '../EmbeddedWidget';
import styles from './WidgetPage.module.scss';

// The Reports widget's MUI variant. ?mission= filters by that mission.
function ReportsPage() {
  const [params] = useSearchParams();
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Reports</h1>
      {/* Keyed so another mission in the URL starts the filter afresh. */}
      <EmbeddedWidget key={params.get('mission') ?? ''} widgetId="Reports" showHeading={false} />
    </div>
  );
}

export default ReportsPage;
