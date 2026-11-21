import { transmissionWaysApi, useTransmissionWays } from '@/api/transmissionWays';
import CatalogManager from '../shared/CatalogManager';

function TransmissionWaysWidget() {
  return (
    <CatalogManager
      noun="transmission way"
      heading="Transmission ways"
      entityType="transmission_ways"
      collection={useTransmissionWays(true)}
      api={transmissionWaysApi}
      deleteNote="Messages sent with it keep showing it, but it is no longer offered for new messages."
    />
  );
}

export default TransmissionWaysWidget;
