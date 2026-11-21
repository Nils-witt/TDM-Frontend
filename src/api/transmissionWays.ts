import { type CatalogEntry, catalogApi } from './catalogs';
import { useCollection } from './collection';
import { listFetcher } from './list';

// How a message was transmitted besides the chat (Tetra, Email, Melder by
// default). A catalog changed by the admin group; deleting is soft, and a
// message keeps the name (its transmission_way carries it).
export type TransmissionWay = CatalogEntry;

export const transmissionWaysPath = '/api/v1/transmission-ways';

const fetchTransmissionWays = listFetcher<TransmissionWay>('transmission_ways');

// null loads nothing: without messages.view, say.
export const useTransmissionWays = (enabled: boolean) =>
  useCollection<TransmissionWay>(enabled ? transmissionWaysPath : null, fetchTransmissionWays);

export const transmissionWaysApi = catalogApi<TransmissionWay>(transmissionWaysPath);
