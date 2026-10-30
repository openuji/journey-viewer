/** The flow's three kinds of text: state names, card titles and captions. */
export type TextRole = "body" | "title" | "caption";

/** Measures one line of text in CSS pixels, for one of the roles the design system styles. */
export type TextMeasure = (text: string, role: TextRole) => number;

const sizes = Object.freeze({ body: 13, title: 13, caption: 12 });
const narrow = "iljtf.,:;'’!|()[] ";
const wide = "mwMW@%";

/**
 * Deterministic width estimate for Node runs (tests, measurements) and before the browser has
 * measured. The browser injects a canvas measurement instead, so exact pixel values differ between
 * the two while every structural invariant must hold for both.
 */
export const estimate: TextMeasure = (text, role) => {
  const bold = role === "title" ? 1.04 : 1;
  const units = [...text].reduce(
    (sum, char) =>
      sum +
      (narrow.includes(char)
        ? 0.3
        : wide.includes(char)
          ? 0.86
          : char >= "A" && char <= "Z"
            ? 0.68
            : char >= "0" && char <= "9"
              ? 0.6
              : 0.56),
    0,
  );
  return Math.ceil(units * sizes[role] * bold);
};

/** Greedy word wrap; an overlong line is ellipsized only after `maxLines`. */
export function wrap(
  text: string,
  role: TextRole,
  maxWidth: number,
  measure: TextMeasure,
  maxLines = 3,
): readonly string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = words.reduce<string[]>((done, word) => {
    const line = done.at(-1);
    const candidate = line === undefined ? word : `${line} ${word}`;
    return line !== undefined && measure(candidate, role) > maxWidth
      ? [...done, word]
      : [...done.slice(0, -1), candidate];
  }, []);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const fits = (line: string): string =>
      line.length > 1 && measure(`${line}…`, role) > maxWidth
        ? fits(line.slice(0, -1))
        : line;
    return [...kept.slice(0, -1), `${fits(kept.at(-1)!).trimEnd()}…`];
  }
  return lines.length > 0 ? lines : [""];
}

export const widest = (
  lines: readonly string[],
  role: TextRole,
  measure: TextMeasure,
): number => Math.max(0, ...lines.map((line) => measure(line, role)));
