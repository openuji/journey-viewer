/** Pure translation of the documented DTCG subset. No checking or file access. */
import { semanticKeys } from "~/tokens/semantic-keys.mjs";

export const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function tokenEntries(value, path = [], inheritedType) {
  if (!isObject(value))
    throw new TypeError(`Expected a token group at ${path.join(".")}.`);
  if (Object.hasOwn(value, "$value"))
    return [{ path, type: value.$type ?? inheritedType, value: value.$value }];
  return Object.keys(value)
    .filter((key) => !key.startsWith("$"))
    .sort()
    .flatMap((key) =>
      tokenEntries(value[key], [...path, key], value.$type ?? inheritedType),
    );
}

export const aliasPath = (value) =>
  typeof value === "string" ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined;

export function resolveValue(value, entries, visited = []) {
  const key = aliasPath(value);
  if (key !== undefined) {
    if (visited.includes(key))
      throw new TypeError(`Broken or cyclic token reference: ${value}.`);
    const target = entries.find((entry) => entry.path.join(".") === key);
    if (!target) throw new TypeError(`Unknown token reference: ${value}.`);
    return resolveValue(target.value, entries, [...visited, key]);
  }
  if (Array.isArray(value))
    return value.map((item) => resolveValue(item, entries, visited));
  if (isObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveValue(item, entries, visited),
      ]),
    );
  return value;
}

const genericFonts = [
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
];

export function cssValue(type, value) {
  switch (type) {
    case "color":
      if (value.colorSpace !== "srgb" || value.components?.length !== 3)
        throw new TypeError("Only sRGB colors are supported.");
      return `rgb(${value.components.map((part) => Math.round(part * 255)).join(" ")} / ${value.alpha ?? 1})`;
    case "dimension":
    case "duration":
      if (
        !Number.isFinite(value.value) ||
        !["px", "rem", "ms", "s"].includes(value.unit)
      )
        throw new TypeError(`Unsupported ${type}.`);
      return `${value.value}${value.unit}`;
    case "fontFamily":
      return (Array.isArray(value) ? value : [value])
        .map((font) =>
          genericFonts.includes(font.toLowerCase())
            ? font
            : JSON.stringify(font),
        )
        .join(", ");
    case "fontWeight":
    case "number":
      if (!Number.isFinite(value)) throw new TypeError(`Unsupported ${type}.`);
      return String(value);
    case "shadow":
      return `${value.inset ? "inset " : ""}${[value.offsetX, value.offsetY, value.blur, value.spread].map((part) => cssValue("dimension", part)).join(" ")} ${cssValue("color", value.color)}`;
    default:
      throw new TypeError(`Unsupported token type: ${type}.`);
  }
}

const variable = (path) => `--jv-${path.join("-")}`;
const declaration = (entry, entries) =>
  `  ${variable(entry.path)}: ${cssValue(entry.type, resolveValue(entry.value, entries))};`;

export function themeCss(foundation, name, theme) {
  if (!/^[a-z][a-z0-9-]*$/.test(name))
    throw new TypeError("Theme names must be lowercase CSS identifiers.");
  const entries = tokenEntries({ ...foundation, ...theme });
  // Re-declare aliases at each boundary so nested themes resolve locally.
  return `:where([data-jv-theme="${name}"]) {\n${entries
    .filter(
      (entry) =>
        entry.path[0] !== "foundation" && entry.path[0] !== "breakpoint",
    )
    .map((entry) => declaration(entry, entries))
    .join(
      "\n",
    )}\n  background-color: var(--jv-color-background);\n  color: var(--jv-color-foreground);\n  font-family: var(--jv-font-sans);\n}\n`;
}

export function generateTokens(foundation, themes) {
  const base = tokenEntries(foundation);
  const themePaths = semanticKeys.map((key) => key.split("."));
  const namespace = {
    color: "color",
    space: "spacing-space",
    size: "spacing-size",
    font: "font",
    text: "text",
    weight: "font-weight",
    radius: "radius",
    shadow: "shadow",
    leading: "leading",
  };
  return {
    tokensCss: `/* Generated from DTCG. Do not edit. */\n${Object.entries(
      themes,
    )
      .map(([name, theme]) => themeCss(foundation, name, theme))
      .join("\n")}`,
    tailwindCss: `/* Generated from DTCG. Do not edit. */\n@theme {\n  --*: initial;\n${base
      .filter((entry) => entry.path[0] === "breakpoint")
      .map(
        (entry) =>
          `  --breakpoint-${entry.path.slice(1).join("-")}: ${cssValue(entry.type, resolveValue(entry.value, base))};`,
      )
      .join("\n")}\n}\n@theme inline {\n${themePaths
      .filter((path) => namespace[path[0]])
      .map(
        (path) =>
          `  --${namespace[path[0]]}-${path.slice(1).join("-")}: var(${variable(path)});`,
      )
      .join("\n")}\n}\n`,
  };
}
