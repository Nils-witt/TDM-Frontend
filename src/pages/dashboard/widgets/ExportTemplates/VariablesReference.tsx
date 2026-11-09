import styles from './ExportTemplates.module.scss';

// Nested lists name the fields of each item. As universalGoApi's
// MissionReport.Context gives them (entities.md).
const variables: { name: string; fields: string }[] = [
  {
    name: 'mission',
    fields:
      'id, event, status, status_label, tags, type and type_group (id, name; empty for none), address (street, house_number, city, district, object_name, latitude, longitude, text), callee, callee_phone, created_by, created_at, updated_by, updated_at',
  },
  {
    name: 'entries',
    fields:
      'the logbook, oldest first, revoked entries included: id, number, created_at, type (id, name; empty for free text), text, created_by, sender, receiver, revoked, revoked_at, revoke_reason, revoked_by, files',
  },
  {
    name: 'files',
    fields:
      'the files of every entry: id, entry_id, name, type (id, name), media_type, size, content_text, created_by, created_at, revoked, revoked_at, revoke_reason, revoked_by, is_image, data_uri (an active image’s content, for <img src>)',
  },
  {
    name: 'tasks',
    fields:
      'the tasks not archived, scheduled ones first by time: id, name, description, scheduled_at, done, done_at, done_by, created_by, created_at',
  },
  { name: 'exported_at, exported_by', fields: 'when and by whom the mission is exported' },
  {
    name: 'is_intermediate',
    fields:
      'true for an intermediate report, false for a final one: {% if not is_intermediate %}…{% endif %} leaves out what belongs only in a final report, such as signature fields',
  },
];

function VariablesReference() {
  return (
    <details className={styles.reference}>
      <summary>Template variables</summary>
      <p className="muted">
        Templates use the pongo2 language, like Jinja or Django:{' '}
        <code>{'{{ mission.event }}'}</code> prints a value (HTML-escaped),{' '}
        <code>{'{% for e in entries %}…{% endfor %}'}</code> and{' '}
        <code>{'{% if … %}…{% endif %}'}</code> repeat and choose, filters change values, e.g.{' '}
        <code>{'{{ e.created_at|date:"02.01.2006 15:04" }}'}</code> (a Go time layout) or{' '}
        <code>{'{{ e.text|linebreaksbr }}'}</code>. The template is the page’s body: add a{' '}
        <code>{'<style>'}</code> element to style it. Templates cannot include other templates or
        files, load anything from the web or run scripts. Times are in the API’s report time zone;
        users are shown by name.
      </p>
      <dl>
        {variables.map((v) => (
          <div key={v.name}>
            <dt>
              <code>{v.name}</code>
            </dt>
            <dd>{v.fields}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export default VariablesReference;
