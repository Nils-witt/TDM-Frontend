import { useEffect, useId, useRef, useState } from 'react';
import type { Overlay } from '@/api/maps';
import { FieldRow, FormActions, Section, WidgetForm } from '@/components/form';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import styles from './Map.module.scss';
import { defaultOverlayState, type OverlayState } from './overlayState';
import { maxZoom, minZoom, parseZoom } from './selectionZoom';

type Props = {
  selectionZoom: number;
  onSelectionZoomChange: (zoom: number) => void;
  // Empty when the API has no tile server, or the caller offers them elsewhere.
  overlays: readonly Overlay[];
  overlayState: Readonly<Record<string, OverlayState>>;
  onOverlayChange: (id: string, state: OverlayState) => void;
};

// Opened from the widget's action bar as a modal dialog. Every change applies
// at once, so the map behind the backdrop shows it; Done, Escape and the
// backdrop close it.
function MapOptions(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <WidgetActionBar label="Map">
        <WidgetAction pressed={open} title="Map options" onClick={() => setOpen(true)}>
          Options
        </WidgetAction>
      </WidgetActionBar>
      {open && <MapOptionsDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

// Opens when mounted; the parent unmounts it to close it.
function MapOptionsDialog({
  selectionZoom,
  onSelectionZoomChange,
  overlays,
  overlayState,
  onOverlayChange,
  onClose,
}: Props & { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Several maps may be on one dashboard.
  const id = useId();
  // Kept as typed, so the field can be cleared while editing; only a valid
  // number reaches the map.
  const [zoomText, setZoomText] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.optionsDialog}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        // Escape: closing is up to the parent, which unmounts the dialog.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <WidgetForm
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <h2 id={`${id}-title`}>Map Options</h2>
        <Section legend="Selection">
          <FieldRow id={`${id}-zoom`} label="Zoom on selection">
            <input
              id={`${id}-zoom`}
              type="number"
              min={minZoom}
              max={maxZoom}
              step={1}
              value={zoomText ?? String(selectionZoom)}
              title="The map zooms in at least this far to the selected mission."
              onChange={(e) => {
                setZoomText(e.target.value);
                const z = parseZoom(e.target.valueAsNumber);
                if (z !== undefined) onSelectionZoomChange(z);
              }}
              onBlur={() => setZoomText(null)}
            />
          </FieldRow>
        </Section>
        {overlays.length > 0 && (
          <Section legend="Overlays">
            <ul className={styles.overlayList}>
              {overlays.map((o) => {
                const s = overlayState[o.id] ?? defaultOverlayState;
                return (
                  <li key={o.id} className={styles.overlayItem}>
                    <label className={styles.overlayName} title={o.description || undefined}>
                      <input
                        type="checkbox"
                        checked={s.on}
                        onChange={(e) => onOverlayChange(o.id, { ...s, on: e.target.checked })}
                      />
                      <span>{o.name || o.id}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={s.opacity}
                      disabled={!s.on}
                      aria-label={`Opacity of ${o.name || o.id}`}
                      onChange={(e) =>
                        onOverlayChange(o.id, { ...s, opacity: Number(e.target.value) })
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
        <FormActions submitLabel="Done" />
      </WidgetForm>
    </dialog>
  );
}

export default MapOptions;
