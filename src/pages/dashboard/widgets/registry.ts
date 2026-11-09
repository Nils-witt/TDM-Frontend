import { lazy } from 'react';
import { missionStatuses } from '@/api/missions';
import { frameCount, frameKeys, windowUnits } from './ActiveMissions/ActiveMissions.ts';
import { logbookFilterOptions } from './shared/logbookFilterOptions';
import type { Widget } from './widget';

const ExampleWidget = lazy(() => import('./Example/Example.tsx'));
const MissionsListWidget = lazy(() => import('./MissionsList/MissionsList.tsx'));
const MissionDetailsWidget = lazy(() => import('./MissionDetails/MissionDetails.tsx'));
const ActiveMissionsWidget = lazy(() => import('./ActiveMissions/ActiveMissions.tsx'));
const LogbookWidget = lazy(() => import('./Logbook/Logbook.tsx'));
const LogbookFormWidget = lazy(() => import('./LogbookForm/LogbookForm.tsx'));
const FileListWidget = lazy(() => import('./FileList/FileList.tsx'));
const AttachmentViewerWidget = lazy(() => import('./AttachmentViewer/AttachmentViewer.tsx'));
const MissionTypesWidget = lazy(() => import('./MissionTypes/MissionTypes.tsx'));
const LogbookTypesWidget = lazy(() => import('./LogbookTypes/LogbookTypes.tsx'));
const FileTypesWidget = lazy(() => import('./FileTypes/FileTypes.tsx'));
const UsersWidget = lazy(() => import('./Users/Users.tsx'));
const GroupsWidget = lazy(() => import('./Groups/Groups.tsx'));
const AuditLogWidget = lazy(() => import('./AuditLog/AuditLog.tsx'));
const MapWidget = lazy(() => import('./Map/Map.tsx'));
const MapStylesWidget = lazy(() => import('./MapStyles/MapStyles.tsx'));
const LayoutsWidget = lazy(() => import('./Layouts/Layouts.tsx'));
const ExportTemplatesWidget = lazy(() => import('./ExportTemplates/ExportTemplates.tsx'));
const ReportsWidget = lazy(() => import('./Reports/Reports.tsx'));
const CreateReportWidget = lazy(() => import('./CreateReport/CreateReport.tsx'));
const PdfViewerWidget = lazy(() => import('./PdfViewer/PdfViewer.tsx'));

const Example: Widget = {
  id: 'Example',
  name: 'Example',
  category: 'general',
  description: 'A starting point for new widgets; shares a selection over channels.',
  emits: ['selection'],
  consumes: ['selection'],
  minWidth: 15,
  maxWidth: 120,
  minHeight: 8,
  maxHeight: 800,
  defaultWidth: 30,
  defaultHeight: 20,
  options: [{ key: 'greeting', label: 'Greeting', type: 'text', default: 'Hello from Universam' }],
  Component: ExampleWidget,
};

// collapse-<status> sets which sections start collapsed.
const MissionsList: Widget = {
  id: 'MissionsList',
  name: 'Missions',
  category: 'missions',
  description: 'The active missions, to pick the one to work on.',
  emits: ['selection'],
  consumes: ['selection'],
  minWidth: 10,
  maxWidth: 120,
  minHeight: 2,
  maxHeight: 800,
  defaultWidth: 6,
  defaultHeight: 4,
  options: [
    { key: 'groupByStatus', label: 'Group by status', type: 'boolean', default: false },
    ...missionStatuses.map((s) => ({
      key: `collapse-${s.value}`,
      label: `Start "${s.label}" collapsed`,
      type: 'boolean' as const,
      default: false,
    })),
  ],
  Component: MissionsListWidget,
};

const MissionDetails: Widget = {
  id: 'MissionDetails',
  name: 'Mission',
  category: 'missions',
  description: 'Shows and edits the selected mission, or creates a new one.',
  emits: ['selection'],
  consumes: ['selection'],
  minWidth: 25,
  maxWidth: 120,
  minHeight: 10,
  maxHeight: 800,
  defaultWidth: 35,
  defaultHeight: 40,
  Component: MissionDetailsWidget,
};

// Counts the missions active in the last amount units, for up to frameCount
// frames; the first is on by default, the others while their amount is above 0.
const ActiveMissions: Widget = {
  id: 'ActiveMissions',
  name: 'Active missions',
  category: 'missions',
  description: 'How many missions were active within recent time frames.',
  minWidth: 10,
  maxWidth: 60,
  minHeight: 6,
  maxHeight: 30,
  defaultWidth: 15,
  defaultHeight: 8,
  options: Array.from({ length: frameCount }, (_, i) => {
    const n = i + 1;
    const keys = frameKeys(n);
    return [
      {
        key: keys.amount,
        label: n === 1 ? 'Time frame 1' : `Time frame ${n} (0 = off)`,
        type: 'number' as const,
        default: n === 1 ? 24 : 0,
        min: n === 1 ? 1 : 0,
      },
      {
        key: keys.unit,
        label: `Time frame ${n} unit`,
        type: 'select' as const,
        default: 'hours',
        choices: windowUnits.map((u) => ({ value: u.value, label: u.label })),
      },
    ];
  }).flat(),
  Component: ActiveMissionsWidget,
};

// The filter options set the filters it starts with.
const Logbook: Widget = {
  id: 'Logbook',
  name: 'Logbook',
  category: 'logbook',
  description: 'The logbook of the selected mission.',
  consumes: ['selection'],
  minWidth: 30,
  maxWidth: 120,
  minHeight: 10,
  maxHeight: 800,
  defaultWidth: 40,
  defaultHeight: 30,
  options: [
    { key: 'showCreate', label: 'Show the Create action', type: 'boolean', default: true },
    ...logbookFilterOptions,
  ],
  Component: LogbookWidget,
};

// The Logbook widget's Create action opens it in a window.
const LogbookForm: Widget = {
  id: 'LogbookForm',
  name: 'New logbook entry',
  category: 'logbook',
  description: 'Writes a new entry into the selected mission’s logbook.',
  consumes: ['selection'],
  minWidth: 25,
  maxWidth: 80,
  minHeight: 15,
  maxHeight: 60,
  defaultWidth: 35,
  defaultHeight: 20,
  options: [
    { key: 'showMission', label: 'Show the selected mission', type: 'boolean', default: true },
  ],
  Component: LogbookFormWidget,
};

const FileList: Widget = {
  id: 'FileList',
  name: 'Files',
  category: 'files',
  description: 'The files attached to the selected mission’s logbook.',
  consumes: ['selection'],
  minWidth: 20,
  maxWidth: 120,
  minHeight: 10,
  maxHeight: 800,
  defaultWidth: 30,
  defaultHeight: 25,
  Component: FileListWidget,
};

// The file lists open it in a window.
const AttachmentViewer: Widget = {
  id: 'AttachmentViewer',
  name: 'Attachment',
  category: 'files',
  description: 'Shows one attached file.',
  minWidth: 20,
  maxWidth: 200,
  minHeight: 10,
  maxHeight: 200,
  defaultWidth: 50,
  defaultHeight: 40,
  windowOnly: true,
  options: [
    { key: 'fileId', label: 'File ID', type: 'text', default: '' },
    { key: 'name', label: 'File name', type: 'text', default: '' },
    { key: 'mediaType', label: 'Media type', type: 'text', default: '' },
  ],
  title: (o) => (o.name === '' ? 'Attachment' : String(o.name)),
  Component: AttachmentViewerWidget,
};

// The stored reports, to create and upload signed; the selected mission is the
// one a new report is made of by default.
const Reports: Widget = {
  id: 'Reports',
  name: 'Reports',
  category: 'files',
  description: 'The mission reports, to create and upload signed.',
  consumes: ['selection'],
  minWidth: 30,
  maxWidth: 160,
  minHeight: 10,
  maxHeight: 800,
  defaultWidth: 60,
  defaultHeight: 30,
  Component: ReportsWidget,
};

// Missions → Create Report opens it for the selected mission; missionId is
// fixed, so it does not follow the selection.
const CreateReport: Widget = {
  id: 'CreateReport',
  name: 'Create report',
  category: 'files',
  description: 'Creates a report of one done or closed mission.',
  minWidth: 25,
  maxWidth: 80,
  minHeight: 10,
  maxHeight: 40,
  defaultWidth: 35,
  defaultHeight: 14,
  windowOnly: true,
  options: [{ key: 'missionId', label: 'Mission ID', type: 'text', default: '' }],
  Component: CreateReportWidget,
};

// path is the API path of the PDF (a printed mission or a report); name is
// what Download saves it as.
const PdfViewer: Widget = {
  id: 'PdfViewer',
  name: 'Document',
  category: 'files',
  description: 'Shows one PDF: a printed mission or a report.',
  minWidth: 20,
  maxWidth: 200,
  minHeight: 10,
  maxHeight: 200,
  defaultWidth: 60,
  defaultHeight: 60,
  windowOnly: true,
  options: [
    { key: 'path', label: 'API path', type: 'text', default: '' },
    { key: 'name', label: 'File name', type: 'text', default: '' },
  ],
  title: (o) => (o.name === '' ? 'Document' : String(o.name).replace(/\.pdf$/, '')),
  Component: PdfViewerWidget,
};

// style picks one of the map styles admins configure (see MapStyles); latitude,
// longitude and zoom the start view; show-<status> which missions it shows.
// With a tile server configured in the API a switcher turns its overlays on
// and off.
const MapView: Widget = {
  id: 'Map',
  name: 'Map',
  category: 'map',
  description: 'Missions on a map; click a mission to select it.',
  emits: ['selection'],
  consumes: ['selection'],
  minWidth: 15,
  maxWidth: 200,
  minHeight: 10,
  maxHeight: 800,
  defaultWidth: 50,
  defaultHeight: 40,
  options: [
    { key: 'style', label: 'Map style', type: 'mapStyle', default: '' },
    { key: 'latitude', label: 'Start latitude', type: 'number', default: 51.16, min: -90, max: 90 },
    {
      key: 'longitude',
      label: 'Start longitude',
      type: 'number',
      default: 10.45,
      min: -180,
      max: 180,
    },
    { key: 'zoom', label: 'Start zoom', type: 'number', default: 5, min: 0, max: 22 },
    ...missionStatuses.map((s) => ({
      key: `show-${s.value}`,
      label: `Show "${s.label}"`,
      type: 'boolean' as const,
      default: true,
    })),
  ],
  Component: MapWidget,
};

// The admin widgets open from the Admin menu only (shown to admins), so the
// picker leaves them out; a layout holding one shows non-admins a notice.
const adminWidget = {
  category: 'admin',
  adminOnly: true,
  hiddenInPicker: true,
  minWidth: 30,
  maxWidth: 120,
  minHeight: 15,
  maxHeight: 800,
  defaultWidth: 50,
  defaultHeight: 45,
} as const;

const MissionTypes: Widget = {
  ...adminWidget,
  id: 'MissionTypes',
  name: 'Mission types',
  description: 'Manages the mission type groups and mission types, with CSV import and export.',
  defaultHeight: 55,
  Component: MissionTypesWidget,
};

const LogbookTypes: Widget = {
  ...adminWidget,
  id: 'LogbookTypes',
  name: 'Logbook types',
  description: 'Manages the types of logbook entries.',
  Component: LogbookTypesWidget,
};

const FileTypes: Widget = {
  ...adminWidget,
  id: 'FileTypes',
  name: 'File types',
  description: 'Manages the types of attached files.',
  Component: FileTypesWidget,
};

// userId highlights a user; Groups sets it.
const Users: Widget = {
  ...adminWidget,
  id: 'Users',
  name: 'Users',
  description: 'The users synced from LDAP, with their groups.',
  defaultWidth: 70,
  options: [{ key: 'userId', label: 'Highlighted user ID', type: 'text', default: '' }],
  Component: UsersWidget,
};

// groupId is the group shown first; Users sets it.
const Groups: Widget = {
  ...adminWidget,
  id: 'Groups',
  name: 'Groups',
  description: 'The LDAP groups and their members.',
  options: [{ key: 'groupId', label: 'Group ID', type: 'text', default: '' }],
  Component: GroupsWidget,
};

const MapStyles: Widget = {
  ...adminWidget,
  id: 'MapStyles',
  name: 'Map styles',
  description: 'Manages the map styles the Map widget can show.',
  defaultWidth: 70,
  Component: MapStylesWidget,
};

// Every user's dashboard layouts: rename, share with everyone or make
// personal, export, delete.
const Layouts: Widget = {
  ...adminWidget,
  id: 'Layouts',
  name: 'Layouts',
  description: 'Manages every user’s dashboard layouts and which are shared with everyone.',
  defaultWidth: 80,
  Component: LayoutsWidget,
};

const ExportTemplates: Widget = {
  ...adminWidget,
  id: 'ExportTemplates',
  name: 'Export templates',
  description: 'The templates missions are printed and reports made with.',
  minWidth: 40,
  maxWidth: 160,
  minHeight: 20,
  defaultWidth: 80,
  defaultHeight: 60,
  Component: ExportTemplatesWidget,
};

// The options are the filter it starts with; the other admin widgets set them.
const AuditLog: Widget = {
  ...adminWidget,
  id: 'AuditLog',
  name: 'Audit log',
  description: 'Every recorded change, newest first, filterable by entity and actor.',
  defaultWidth: 60,
  defaultHeight: 50,
  options: [
    { key: 'entityType', label: 'Entity type', type: 'text', default: '' },
    { key: 'entityId', label: 'Entity ID', type: 'text', default: '' },
    { key: 'actor', label: 'Actor', type: 'text', default: '' },
  ],
  title: (o) => {
    if (o.actor !== '') return `Audit log: changes by ${String(o.actor)}`;
    if (o.entityType !== '') return `Audit log: ${String(o.entityType)}`;
    return 'Audit log';
  },
  Component: AuditLogWidget,
};

export const widgets: Record<string, Widget> = Object.fromEntries(
  [
    MissionsList,
    MissionDetails,
    MapView,
    ActiveMissions,
    Logbook,
    LogbookForm,
    FileList,
    AttachmentViewer,
    Reports,
    CreateReport,
    PdfViewer,
    MissionTypes,
    LogbookTypes,
    FileTypes,
    MapStyles,
    ExportTemplates,
    Layouts,
    Users,
    Groups,
    AuditLog,
    Example,
  ].map((w) => [w.id, w]),
);
