import { Button, TouchpointDot } from "@journey-viewer/design-system";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { referenceLabel } from "@/occurrence-presentation";
import { touchpointColor, touchpointLabel } from "@/presentation";
import type { TouchpointPresentation } from "@/presentation";
import { useViewer } from "@/components/Viewer/Viewer";
import styles from "@/components/TouchpointFilter/TouchpointFilter.module.css";

export interface ControlledTouchpointFilterProps {
  readonly document: UjgDocument;
  readonly touchpoints: TouchpointPresentation;
  /** The chosen touchpoint; empty shows every journey. */
  readonly selected: readonly string[];
  /** Null shows every journey. */
  readonly onSelect: (id: string | null) => void;
}

/** “All” and one pill per touchpoint; at most one is chosen. */
export function ControlledTouchpointFilter({
  document,
  touchpoints: presentation,
  selected,
  onSelect,
}: ControlledTouchpointFilterProps) {
  const touchpoints = getNodesByType(document, "Touchpoint");
  return (
    <div
      role="group"
      aria-label="Touchpoint filter"
      className={styles.touchpoints}
    >
      <Button
        variant="pill"
        size="xs"
        selected={selected.length === 0}
        aria-pressed={selected.length === 0}
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {touchpoints.map((touchpoint, index) => {
        const color = touchpointColor(touchpoint, presentation);
        const chosen = selected.includes(touchpoint["@id"]);
        return (
          <Button
            key={`${index}:${touchpoint["@id"]}`}
            variant="pill"
            size="xs"
            title={
              typeof touchpoint.label === "string"
                ? touchpoint.label
                : touchpoint["@id"]
            }
            data-touchpoint-ref={touchpoint["@id"]}
            selected={chosen}
            aria-pressed={chosen}
            onClick={() => onSelect(touchpoint["@id"])}
          >
            <TouchpointDot
              label={touchpointLabel(touchpoint, presentation)}
              decorative
              {...(color ? { color } : {})}
            />
            {referenceLabel(touchpoints, index, (node) =>
              touchpointLabel(node, presentation),
            )}
          </Button>
        );
      })}
    </div>
  );
}

export function TouchpointFilter() {
  const { document, touchpoints, state, dispatch } = useViewer();
  return (
    <ControlledTouchpointFilter
      document={document}
      touchpoints={touchpoints}
      selected={state.disclosure.snapshot.navigation.touchpointRefs}
      onSelect={(id) => dispatch({ type: "touchpoint", id })}
    />
  );
}
