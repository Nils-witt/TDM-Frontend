import type { PartyFilter } from './logbookEntries';

// Both must match. In a FieldRow, id is the sender box's.
function PartyFilterInputs({
  id,
  filter,
  onChange,
}: {
  id?: string;
  filter: PartyFilter;
  onChange: (filter: PartyFilter) => void;
}) {
  return (
    <>
      <input
        id={id}
        type="search"
        className="grow"
        value={filter.sender}
        onChange={(e) => onChange({ ...filter, sender: e.target.value })}
        placeholder="Filter by sender"
        aria-label="Filter by sender"
      />
      <input
        type="search"
        className="grow"
        value={filter.receiver}
        onChange={(e) => onChange({ ...filter, receiver: e.target.value })}
        placeholder="Filter by receiver"
        aria-label="Filter by receiver"
      />
    </>
  );
}

export default PartyFilterInputs;
