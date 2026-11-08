// In the order the widget picker lists them.
export const widgetCategories = [
  { id: 'missions', label: 'Missions' },
  { id: 'logbook', label: 'Logbook' },
  { id: 'files', label: 'Files' },
  { id: 'general', label: 'General' },
] as const;

export type WidgetCategory = (typeof widgetCategories)[number]['id'];
