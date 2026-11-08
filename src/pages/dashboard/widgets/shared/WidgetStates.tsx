// In the style of Mission Details.

import type { ReactNode } from 'react';

export function NoSelection({ className }: { className?: string }) {
  return <p className={className ? `muted ${className}` : 'muted'}>Nothing selected.</p>;
}

export function NoMission({ className }: { className?: string }) {
  return <p className={className ? `muted ${className}` : 'muted'}>No mission selected.</p>;
}

// className replaces the default top margin (mt), e.g. with '' under a
// SectionHeading or inside a sectionStack, which space it themselves.
export function EmptyState({
  className = 'mt',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={className ? `muted ${className}` : 'muted'}>{children}</p>;
}
