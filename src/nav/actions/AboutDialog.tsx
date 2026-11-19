import type { Ref } from 'react';
import { type BackupStatus, backupStatusPath } from '@/api/backup';
import { serviceLabel, useConnections } from '@/api/connections';
import { useResource } from '@/api/resource';
import { buildLabel, useApiVersion } from '@/api/version';
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
        <Section legend="Versions">
          <Versions />
        </Section>
        <FormActions submitLabel="OK" />
      </WidgetForm>
    </dialog>
  );
}

const when = (iso: string) => (iso ? new Date(iso).toLocaleString() : '');

const short = (commit: string) => commit.slice(0, 7);

// The frontend's build, the API's and those of the services the API is
// connected to, as the API last read them. The backup instances' come from
// the shared backup status (polled by its indicator), so none is polled here.
function Versions() {
  const api = useApiVersion().data;
  const connections = useConnections().data?.connections ?? [];
  const backup = useResource<BackupStatus>(backupStatusPath).data;

  return (
    <dl className={styles.versions}>
      <dt>Frontend</dt>
      <Build
        version={__APP_VERSION__}
        commit={__APP_COMMIT__}
        builtAt={__APP_BUILD_TIME__}
        modified={false}
      />
      <dt>Backend</dt>
      {api ? (
        <Build
          version={api.version}
          commit={api.commit}
          builtAt={api.build_time}
          modified={api.modified}
        />
      ) : (
        <dd>unknown</dd>
      )}
      {connections.map((c) => (
        <Row
          key={c.service}
          label={serviceLabel(c.service)}
          version={c.version}
          down={c.state === 'disconnected'}
        />
      ))}
      {backup?.enabled &&
        backup.instances.map((i) => (
          <Row
            key={i.id}
            label={`Backup: ${i.name}`}
            version={i.version}
            down={i.error !== undefined}
          />
        ))}
    </dl>
  );
}

// The release with its short commit, or the short commit alone for a build
// without a release; when it was built is in the title.
function Build({
  version,
  commit,
  builtAt,
  modified,
}: {
  version: string;
  commit: string;
  builtAt: string;
  modified: boolean;
}) {
  const label = buildLabel(version, commit);
  return (
    <dd title={builtAt ? `Built ${when(builtAt)}` : undefined}>
      {label}
      {commit && label !== short(commit) && (
        <span className={styles.muted}> · {short(commit)}</span>
      )}
      {modified && <span className={styles.muted}> · modified</span>}
    </dd>
  );
}

function Row({
  label,
  version,
  down,
}: {
  label: string;
  version: string | null | undefined;
  down: boolean;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {version || 'unknown'}
        {down && <span className={styles.down}> · disconnected</span>}
      </dd>
    </>
  );
}

export default AboutDialog;
