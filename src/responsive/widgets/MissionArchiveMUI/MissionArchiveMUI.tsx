import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Fragment, type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { type Mission, missionStatuses } from '@/api/missions';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useCatalogs } from '@/data/catalogContext';
import {
  type ArchiveFilter,
  emptyFilter,
  isEmptyFilter,
  locationText,
  type SortKey,
  sortColumns,
  typeName,
  useMissionArchive,
} from '@/pages/dashboard/widgets/MissionArchive/MissionArchive.ts';
import { useUnitSuggestions } from '@/pages/dashboard/widgets/MissionArchive/unitSuggestions';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import type { WidgetProps } from '@/pages/dashboard/widgets/widgetOptions';
import { responsivePaths } from '../../paths';
import StatusChip from '../../StatusChip';
import AddressFieldMUI from '../shared/AddressFieldMUI';
import { FieldRowMUI, FormActionsMUI, FormMUI, FormSectionMUI, MutedMUI } from '../shared/FormMUI';
import { useArchiveUrlState } from './archiveUrl';

// The Mission Archive widget in MUI, with useMissionArchive's behavior. The
// search is kept in the URL; a result opens the mission's page.
function MissionArchiveMUI({ options }: WidgetProps) {
  const initialStatus = String(options.status ?? '');
  const state = useArchiveUrlState(initialStatus);
  const archive = useMissionArchive({ initialStatus, state });

  if (archive.error) return <Alert severity="error">{archive.error}</Alert>;
  return (
    <Stack sx={{ gap: 2 }}>
      <FilterFormMUI
        // A new key resets the inputs when the applied filter changes.
        key={JSON.stringify(archive.filter)}
        filter={archive.filter}
        onApply={archive.setFilter}
      />
      {archive.offline && (
        <Alert severity="info">Offline: searching only the missions stored on this device.</Alert>
      )}
      <Stack direction="row" useFlexGap sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.secondary" sx={{ flex: 1 }}>
          {archive.loading
            ? 'Missions'
            : `${archive.total} ${archive.total === 1 ? 'mission' : 'missions'}`}
        </Typography>
        <TextField
          select
          size="small"
          label="Sort by"
          value={archive.sort.key}
          onChange={(e) => archive.sortBy(e.target.value as SortKey)}
          sx={{ minWidth: '9rem' }}
        >
          {sortColumns.map((c) => (
            <MenuItem key={c.key} value={c.key}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          aria-label={archive.sort.descending ? 'Descending, reverse' : 'Ascending, reverse'}
          title={archive.sort.descending ? 'Descending' : 'Ascending'}
          onClick={() => archive.sortBy(archive.sort.key)}
        >
          <SymbolIcon name={archive.sort.descending ? 'arrow_downward' : 'arrow_upward'} />
        </IconButton>
      </Stack>
      {archive.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : archive.results.length === 0 ? (
        <MutedMUI>No missions match.</MutedMUI>
      ) : (
        <>
          <List
            disablePadding
            aria-busy={archive.busy}
            sx={{ opacity: archive.busy ? 0.5 : 1, transition: 'opacity 0.2s' }}
          >
            {archive.results.map((m, i) => (
              <Fragment key={m.id}>
                {i > 0 && <Divider component="li" aria-hidden />}
                <ResultMUI mission={m} catalogs={archive.catalogs} />
              </Fragment>
            ))}
          </List>
          {archive.pages > 1 && (
            <Pagination
              count={archive.pages}
              page={archive.page}
              onChange={(_, p) => archive.setPage(p)}
              showFirstButton
              showLastButton
              siblingCount={0}
              sx={{ alignSelf: 'center' }}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function ResultMUI({
  mission: m,
  catalogs,
}: {
  mission: Mission;
  catalogs: Parameters<typeof typeName>[1];
}) {
  const type = typeName(m, catalogs);
  const location = [locationText(m), m.address_city, m.address_district].filter(Boolean).join(', ');
  return (
    <li>
      <ListItemButton
        component={Link}
        to={responsivePaths.mission(m.id)}
        sx={{ gap: 1.5, alignItems: 'flex-start', px: 1 }}
      >
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
            {m.occurred_event || 'Untitled mission'}
          </Typography>
          {type && (
            <Typography variant="body2" color="text.secondary">
              {type}
            </Typography>
          )}
          {location && (
            <Typography variant="body2" color="text.secondary">
              {location}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {formatTime(m.created_at)}
          </Typography>
        </Stack>
        <StatusChip status={m.status} />
      </ListItemButton>
    </li>
  );
}

function FilterFormMUI({
  filter,
  onApply,
}: {
  filter: ArchiveFilter;
  onApply: (f: ArchiveFilter) => void;
}) {
  const [draft, setDraft] = useState(filter);
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const set = (key: keyof ArchiveFilter) => (value: string) => setDraft({ ...draft, [key]: value });
  const unitSuggest = useUnitSuggestions(draft.unit);

  const groups = [...missionTypeGroups.items].sort((a, b) => a.name.localeCompare(b.name));
  const types = missionTypes.items
    .filter((t) => draft.typeGroup === '' || t.group_id === draft.typeGroup)
    .sort((a, b) => a.name.localeCompare(b.name));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply(draft);
  };

  const text = (key: keyof ArchiveFilter, label: string, placeholder?: string) => (
    <TextField
      label={label}
      size="small"
      type="search"
      value={draft[key]}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(e) => set(key)(e.target.value)}
    />
  );
  const anyLabel = { select: { displayEmpty: true }, inputLabel: { shrink: true } };

  return (
    <FormMUI onSubmit={submit}>
      <FormSectionMUI legend="Search">
        <TextField
          label="Any field"
          size="small"
          type="search"
          value={draft.text}
          placeholder="Event, type, address, callee, tag…"
          autoComplete="off"
          onChange={(e) => set('text')(e.target.value)}
          fullWidth
        />
        <Accordion
          disableGutters
          elevation={0}
          defaultExpanded={!isEmptyFilter({ ...filter, text: '' })}
          sx={{ bgcolor: 'transparent', '&::before': { display: 'none' } }}
        >
          <AccordionSummary
            expandIcon={<SymbolIcon name="expand_more" />}
            sx={{ px: 0, minHeight: 0 }}
          >
            <Typography variant="body2">By field</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {text('event', 'Event')}
            <TextField
              select
              label="Status"
              size="small"
              value={draft.status}
              onChange={(e) => set('status')(e.target.value)}
              slotProps={anyLabel}
            >
              <MenuItem value="">Any status</MenuItem>
              {missionStatuses.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <FieldRowMUI>
              <TextField
                select
                label="Type group"
                size="small"
                value={draft.typeGroup}
                onChange={(e) => {
                  const group = e.target.value;
                  const type = missionTypes.byId.get(draft.type);
                  // Keep the type only while it belongs to the group.
                  const keep = group === '' || type?.group_id === group;
                  setDraft({ ...draft, typeGroup: group, type: keep ? draft.type : '' });
                }}
                slotProps={anyLabel}
              >
                <MenuItem value="">Any group</MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Type"
                size="small"
                value={draft.type}
                onChange={(e) => set('type')(e.target.value)}
                slotProps={anyLabel}
              >
                <MenuItem value="">Any type</MenuItem>
                {types.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            </FieldRowMUI>
            {text('objectName', 'Object')}
            {text('street', 'Street')}
            <FieldRowMUI>
              {text('city', 'City')}
              {text('district', 'District')}
            </FieldRowMUI>
            {text('callee', 'Callee', 'Name or phone')}
            {text('tag', 'Tag')}
            <AddressFieldMUI
              label="Unit"
              value={draft.unit}
              onChange={set('unit')}
              {...unitSuggest}
            />
            <FieldRowMUI>
              <TextField
                label="Created from"
                size="small"
                type="date"
                value={draft.createdFrom}
                onChange={(e) => set('createdFrom')(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: draft.createdTo || undefined },
                }}
              />
              <TextField
                label="Created to"
                size="small"
                type="date"
                value={draft.createdTo}
                onChange={(e) => set('createdTo')(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: draft.createdFrom || undefined },
                }}
              />
            </FieldRowMUI>
          </AccordionDetails>
        </Accordion>
      </FormSectionMUI>
      <FormActionsMUI
        submitLabel="Search"
        canSubmit
        onDiscard={() => {
          // The key resets the inputs only when the applied filter changes.
          setDraft(emptyFilter);
          onApply(emptyFilter);
        }}
        discardLabel="Clear"
        dirty={!isEmptyFilter(draft) || !isEmptyFilter(filter)}
      />
    </FormMUI>
  );
}

export default MissionArchiveMUI;
