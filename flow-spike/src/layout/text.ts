/** Measures one line of text in CSS pixels for a CSS font shorthand. */
export type Measure = (text: string, font: string) => number;

export const FONT_FAMILY = "Inter, ui-sans-serif, system-ui, sans-serif";
export const fonts = Object.freeze({
  body: `400 13px ${FONT_FAMILY}`,
  title: `600 13px ${FONT_FAMILY}`,
  caption: `400 12px ${FONT_FAMILY}`,
});

const narrow = new Set("iljtf.,:;'’!|()[] ");
const wide = new Set("mwMW@%");

/**
 * Deterministic width estimate for Node runs (tests, measurements). The browser injects a canvas
 * measurement instead, so exact pixel values differ between the two while every structural
 * invariant must hold for both.
 */
export const estimate: Measure = (text, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 13);
  const bold = /^(500|600|700)/.test(font) ? 1.04 : 1;
  let units = 0;
  for (const char of text) {
    if (narrow.has(char)) units += 0.3;
    else if (wide.has(char)) units += 0.86;
    else if (char >= "A" && char <= "Z") units += 0.68;
    else if (char >= "0" && char <= "9") units += 0.6;
    else units += 0.56;
  }
  return Math.ceil(units * size * bold);
};

/** Greedy word wrap; an overlong line is ellipsized only after `maxLines`. */
export function wrap(
  text: string,
  font: string,
  maxWidth: number,
  measure: Measure,
  maxLines = 3,
): readonly string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1]!;
    while (last.length > 1 && measure(`${last}…`, font) > maxWidth)
      last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines.length > 0 ? lines : [""];
}

export const widest = (
  lines: readonly string[],
  font: string,
  measure: Measure,
): number => Math.max(0, ...lines.map((line) => measure(line, font)));
