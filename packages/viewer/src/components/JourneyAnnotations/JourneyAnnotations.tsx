import type { ViewerAnnotation, ViewerNodeContext } from "@/extensions";
import styles from "@/components/JourneyAnnotations/JourneyAnnotations.module.css";

interface JourneyAnnotationsProps {
  readonly context: ViewerNodeContext;
  readonly annotations: readonly ViewerAnnotation[];
}

/** Private presentation outlet; descriptors are evaluated anew for the supplied source context. */
export function JourneyAnnotations({
  context,
  annotations,
}: JourneyAnnotationsProps) {
  const matching = annotations.filter((annotation) =>
    annotation.matches(context),
  );
  return matching.length > 0 ? (
    <ul className={styles.annotations}>
      {matching.map(({ id, Component }) => (
        <li key={id}>
          <Component {...context} />
        </li>
      ))}
    </ul>
  ) : null;
}
