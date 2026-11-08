// In the order the widget picker lists them.
export const widgetCategories = [{ id: 'general', label: 'General' }] as const;

export type WidgetCategory = (typeof widgetCategories)[number]['id'];
