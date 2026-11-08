import type { Ref } from 'react';
import { displayName, useSession } from '@/app/session';
import { FormActions, Section, SectionText, WidgetForm } from '@/components/form';
import { LocationIcon } from '@/components/icons.tsx';
import styles from './AboutDialog.module.scss';

function AboutDialog({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const { principal, mode } = useSession();
  return (
    <dialog
      ref={ref}
      className={styles.about}
      aria-labelledby="about-dialog-title"
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <WidgetForm
        onSubmit={(e) => {
          e.preventDefault();
          e.currentTarget.closest('dialog')?.close();
        }}
      >
        <div className={styles.head}>
          <div className={styles.logo}>
            <LocationIcon />
          </div>
          <h2 id="about-dialog-title">Universam</h2>
        </div>
        <Section legend="Logged in as">
          <SectionText>
            {displayName(principal)}
            {principal.username && ` (${principal.username})`}
            {mode === 'proxy' && ' · client certificate'}
          </SectionText>
        </Section>
        {principal.groups.length > 0 && (
          <Section legend="Groups">
            <SectionText>{principal.groups.join(', ')}</SectionText>
          </Section>
        )}
        <FormActions submitLabel="OK" />
      </WidgetForm>
    </dialog>
  );
}

export default AboutDialog;
