import { lazy } from 'react';
import { widgets } from '@/pages/dashboard/widgets/registry';
import type { Widget } from '@/pages/dashboard/widgets/widget';

// MUI variants of the desktop widgets, keyed by the desktop ID so openWidget
// calls from shared code (e.g. 'AttachmentViewer' from a file list) open them
// here. Options, title and the rest come from the desktop entry.
const variants: Record<string, Widget['Component']> = {
  Logbook: lazy(() => import('./LogbookMUI/LogbookMUI.tsx')),
  LogbookForm: lazy(() => import('./LogbookFormMUI/LogbookFormMUI.tsx')),
  AttachmentViewer: lazy(() => import('./AttachmentViewerMUI/AttachmentViewerMUI.tsx')),
  PdfViewer: lazy(() => import('./PdfViewerMUI/PdfViewerMUI.tsx')),
  MissionArchive: lazy(() => import('./MissionArchiveMUI/MissionArchiveMUI.tsx')),
  Reports: lazy(() => import('./ReportsMUI/ReportsMUI.tsx')),
};

const muiWidgets: Record<string, Widget> = Object.fromEntries(
  Object.entries(variants).flatMap(([id, Component]) => {
    const base = widgets[id];
    return base ? [[id, { ...base, Component } as Widget]] : [];
  }),
);

// The MUI variant if there is one, else the desktop widget.
export const responsiveWidget = (id: string): Widget | undefined => muiWidgets[id] ?? widgets[id];
