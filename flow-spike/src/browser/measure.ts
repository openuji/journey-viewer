import type { Measure } from "@/layout/text";

let context: CanvasRenderingContext2D | null = null;

/** Browser text measurement with the fonts the page actually renders. */
export const canvasMeasure: Measure = (text, font) => {
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return text.length * 7;
  context.font = font;
  return Math.ceil(context.measureText(text).width);
};
