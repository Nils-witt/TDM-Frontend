import type { LogFile } from '@/api/logbook';

export type PreviewKind = 'image' | 'pdf' | 'text';

// Those browsers render in an <img>.
const imageTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/svg+xml',
]);

// Besides text/* and the +json and +xml suffixes.
const textTypes = new Set([
  'application/json',
  'application/ld+json',
  'application/x-ndjson',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'application/toml',
  'application/javascript',
  'application/x-sh',
  'application/sql',
]);

// For files uploaded without a media type the browser knew.
const textExtensions = new Set([
  'txt',
  'log',
  'md',
  'csv',
  'tsv',
  'json',
  'ndjson',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'conf',
  'cfg',
]);

// null: the file is only downloaded.
export function previewKind(f: Pick<LogFile, 'name' | 'media_type'>): PreviewKind | null {
  const mt = (f.media_type.split(';', 1)[0] ?? '').trim().toLowerCase();
  if (imageTypes.has(mt)) return 'image';
  if (mt === 'application/pdf') return 'pdf';
  if (mt.startsWith('text/') || textTypes.has(mt) || mt.endsWith('+json') || mt.endsWith('+xml')) {
    return 'text';
  }
  if (mt === 'application/octet-stream' || mt === '') {
    const dot = f.name.lastIndexOf('.');
    if (dot >= 0 && textExtensions.has(f.name.slice(dot + 1).toLowerCase())) return 'text';
  }
  return null;
}
