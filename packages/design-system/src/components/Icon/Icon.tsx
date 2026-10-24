import styles from "@/components/Icon/Icon.module.css";

export type IconName =
  | "chevron"
  | "phone"
  | "expand-all"
  | "collapse-all"
  | "reset"
  | "previous"
  | "next"
  | "close";
export interface IconProps {
  readonly name: IconName;
  readonly className?: string;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Decorative glyphs; the enclosing control supplies the accessible name. */
export function Icon({ name, className }: IconProps) {
  const size = name === "chevron" ? 12 : name === "phone" ? 15 : 16;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={[styles.icon, className].filter(Boolean).join(" ")}
      data-icon={name}
    >
      {name === "chevron" && (
        <path d="M6 4l4 4-4 4" {...stroke} strokeWidth="1.7" />
      )}
      {name === "phone" && (
        <>
          <rect
            x="4"
            y="1.5"
            width="8"
            height="13"
            rx="2"
            {...stroke}
            strokeWidth="1.3"
          />
          <path d="M7 12.1h2" {...stroke} strokeWidth="1.3" />
        </>
      )}
      {name === "expand-all" && (
        <path d="M5 6l3-3 3 3M5 10l3 3 3-3" {...stroke} strokeWidth="1.5" />
      )}
      {name === "collapse-all" && (
        <path d="M5 3l3 3 3-3M5 13l3-3 3 3" {...stroke} strokeWidth="1.5" />
      )}
      {name === "reset" && (
        <path
          d="M3.2 8a4.8 4.8 0 1 0 1.4-3.4M3.5 2.2v2.7h2.7"
          {...stroke}
          strokeWidth="1.5"
        />
      )}
      {name === "previous" && (
        <path d="M10 3.5 5.5 8l4.5 4.5" {...stroke} strokeWidth="1.7" />
      )}
      {name === "next" && (
        <path d="M6 3.5 10.5 8 6 12.5" {...stroke} strokeWidth="1.7" />
      )}
      {name === "close" && (
        <path d="M4 4l8 8M12 4l-8 8" {...stroke} strokeWidth="1.6" />
      )}
    </svg>
  );
}
