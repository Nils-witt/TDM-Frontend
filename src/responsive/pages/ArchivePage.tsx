import EmbeddedWidget from '../EmbeddedWidget';
import styles from './WidgetPage.module.scss';

// The Mission Archive widget's MUI variant: every mission, closed ones of any
// age included, searched by the API. Its search is kept in the URL.
function ArchivePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Archive</h1>
      <EmbeddedWidget widgetId="MissionArchive" showHeading={false} />
    </div>
  );
}

export default ArchivePage;
