import { useRef } from "react";
import type { ReactNode } from "react";

export const JOURNEY_FILE_TYPES =
  ".jsonld,.json,application/ld+json,application/json";

/**
 * One hidden native file input shared by every "Open file…" control on the page.
 * Choosing the same file again still reports it, because the value is cleared after each choice.
 */
export function useFilePicker(
  onFile: (file: File) => void,
): Readonly<{ input: ReactNode; open: () => void }> {
  const ref = useRef<HTMLInputElement>(null);
  return {
    input: (
      <input
        ref={ref}
        id="journey-file"
        type="file"
        accept={JOURNEY_FILE_TYPES}
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(file);
          event.currentTarget.value = "";
        }}
      />
    ),
    open: () => ref.current?.click(),
  };
}
