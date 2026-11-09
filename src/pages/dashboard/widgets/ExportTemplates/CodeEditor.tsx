import { useEffect, useRef } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { jinja } from '@codemirror/lang-jinja';
import { tags } from '@lezer/highlight';
import styles from './ExportTemplates.module.scss';

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  // For assistive technology.
  label: string;
};

// Theme colors, so the template reads in light and dark mode alike.
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: 'var(--primary)' },
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--primary)' },
  { tag: [tags.attributeName, tags.propertyName], color: 'var(--warning)' },
  { tag: [tags.string, tags.attributeValue], color: 'var(--success)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--warning)' },
  { tag: [tags.variableName], color: 'var(--text)' },
  { tag: [tags.comment, tags.blockComment], color: 'var(--text-secondary)', fontStyle: 'italic' },
  { tag: [tags.brace, tags.bracket, tags.punctuation], color: 'var(--text-secondary)' },
  { tag: tags.invalid, color: 'var(--error)' },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--surface)', color: 'var(--text)', height: '100%' },
  '.cm-content': { caretColor: 'var(--text)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-secondary)',
    borderRight: '1px solid var(--divider)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--primary) 7%, transparent)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
  },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
});

// Uncontrolled after mounting: value only sets the initial text, and every edit
// is reported through onChange.
function CodeEditor({ id, value, onChange, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const changed = useRef(onChange);
  const initial = useRef(value);

  useEffect(() => {
    changed.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      doc: initial.current,
      parent: host.current,
      extensions: [
        basicSetup,
        jinja(),
        syntaxHighlighting(highlight),
        theme,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': label, id }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) changed.current(u.state.doc.toString());
        }),
      ],
    });
    return () => view.destroy();
  }, [id, label]);

  return <div ref={host} className={styles.code} />;
}

export default CodeEditor;
