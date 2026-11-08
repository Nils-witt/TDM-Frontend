import type { FormEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import Alert from '../Alert';
import { submitOnModEnter as submitShortcut } from '../submitShortcut';
import styles from './WidgetForm.module.scss';

// Cmd+Enter (Ctrl+Enter off macOS) submits unless submitOnModEnter is false or
// onKeyDown prevented the default.
export function WidgetForm({
  onSubmit,
  onKeyDown,
  ref,
  className,
  submitOnModEnter = true,
  'aria-label': ariaLabel,
  'data-tour': tourId,
  children,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLFormElement>) => void;
  ref?: Ref<HTMLFormElement>;
  className?: string;
  submitOnModEnter?: boolean;
  'aria-label'?: string;
  'data-tour'?: string;
  children: ReactNode;
}) {
  const keyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    onKeyDown?.(e);
    if (submitOnModEnter && !e.defaultPrevented) submitShortcut(e);
  };
  return (
    <form
      ref={ref}
      className={className ? `${styles.form} ${className}` : styles.form}
      onSubmit={onSubmit}
      onKeyDown={keyDown}
      aria-label={ariaLabel}
      data-tour={tourId}
    >
      {children}
    </form>
  );
}

// disabled makes all of it read-only.
export function Section({
  legend,
  disabled,
  className,
  children,
}: {
  legend: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      className={className ? `${styles.section} ${className}` : styles.section}
      disabled={disabled}
    >
      <legend className={styles.legend}>{legend}</legend>
      {children}
    </fieldset>
  );
}

// Heads a full-width table or list outside a Section, in the look of a
// Section's legend.
export function SectionHeading({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2 className={className ? `${styles.heading} ${className}` : styles.heading}>{children}</h2>
  );
}

function RequiredMark() {
  return (
    <span className={styles.required} aria-hidden="true">
      {' '}
      *
    </span>
  );
}

// id is the input the label belongs to; marked adds a RequiredMark; wrapLabel
// lets a label longer than the label column wrap instead of running into the
// inputs.
export function FieldRow({
  id,
  label,
  marked = false,
  wrapLabel = false,
  children,
}: {
  id: string;
  label: ReactNode;
  marked?: boolean;
  wrapLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wrapLabel ? `${styles.row} ${styles.wrapLabel}` : styles.row}>
      <label htmlFor={id}>
        {label}
        {marked && <RequiredMark />}
      </label>
      <div className={styles.inputs}>{children}</div>
    </div>
  );
}

// A read-only value or a hint inside a section.
export function SectionText({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={className ? `${styles.text} ${className}` : styles.text}>{children}</p>;
}

// hidden leaves the buttons out, e.g. while read-only. Discard is enabled while
// dirty (by default always). aside is a note at the end of the row, e.g. why
// the form cannot be submitted.
export function FormActions({
  submitLabel,
  canSubmit = true,
  busy = false,
  onDiscard,
  discardLabel = 'Discard',
  dirty = true,
  hidden = false,
  extra,
  aside,
  autoFocus = false,
}: {
  submitLabel: ReactNode;
  canSubmit?: boolean;
  busy?: boolean;
  onDiscard?: () => void;
  discardLabel?: ReactNode;
  dirty?: boolean;
  hidden?: boolean;
  extra?: ReactNode;
  aside?: ReactNode;
  autoFocus?: boolean;
}) {
  if (hidden) return null;
  return (
    <div className="row">
      {extra}
      <button
        type="submit"
        className="btn primary"
        disabled={!canSubmit || busy}
        autoFocus={autoFocus}
      >
        {submitLabel}
      </button>
      {onDiscard && (
        <button type="button" className="btn" onClick={onDiscard} disabled={!dirty || busy}>
          {discardLabel}
        </button>
      )}
      {aside && <div className={styles.aside}>{aside}</div>}
    </div>
  );
}

export function FormError({ error, onClose }: { error: ReactNode; onClose: () => void }) {
  if (!error) return null;
  return (
    <Alert severity="error" onClose={onClose}>
      {error}
    </Alert>
  );
}
