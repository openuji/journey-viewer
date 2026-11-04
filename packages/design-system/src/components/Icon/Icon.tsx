import {
  AlignCenterVertical,
  AlignStartVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns3,
  Download,
  Expand,
  File,
  Info,
  RotateCcw,
  Rows3,
  Shrink,
  Smartphone,
  Square,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "@/components/Icon/Icon.module.css";

export type IconName =
  | "chevron"
  | "phone"
  | "expand-all"
  | "collapse-all"
  | "reset"
  | "previous"
  | "next"
  | "close"
  | "check"
  | "file"
  | "upload"
  | "download"
  | "layout-rows"
  | "layout-columns"
  | "align-median"
  | "align-centre"
  | "align-left"
  | "zoom-actual"
  | "zoom-fit"
  | "frames"
  | "frame"
  | "legend";
export interface IconProps {
  readonly name: IconName;
  readonly className?: string;
}

/** One family, Lucide, for every glyph: each name says what the glyph is for. */
const glyphs: Readonly<Record<IconName, LucideIcon>> = {
  chevron: ChevronRight,
  phone: Smartphone,
  "expand-all": ChevronsUpDown,
  "collapse-all": ChevronsDownUp,
  reset: RotateCcw,
  previous: ChevronLeft,
  next: ChevronRight,
  close: X,
  check: Check,
  file: File,
  upload: Upload,
  download: Download,
  "layout-rows": Rows3,
  "layout-columns": Columns3,
  // Placement: states placed by their connections, centred on an axis, or flush left.
  "align-median": Workflow,
  "align-centre": AlignCenterVertical,
  "align-left": AlignStartVertical,
  // Zoom: the flow at its full size, or shrunk to fit the canvas.
  "zoom-actual": Expand,
  "zoom-fit": Shrink,
  // Journeys: every root journey stacked, or one.
  frames: Rows3,
  frame: Square,
  legend: Info,
};

const sizes: Readonly<Partial<Record<IconName, number>>> = {
  chevron: 12,
  check: 13,
  phone: 15,
  file: 15,
};

/** Decorative glyphs; the enclosing control supplies the accessible name. */
export function Icon({ name, className }: IconProps) {
  const Glyph = glyphs[name];
  return (
    <Glyph
      size={sizes[name] ?? 16}
      strokeWidth={1.5}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable="false"
      className={[styles.icon, className].filter(Boolean).join(" ")}
      data-icon={name}
    />
  );
}
