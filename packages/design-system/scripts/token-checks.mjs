import {
  aliasPath,
  cssValue,
  isObject,
  resolveValue,
  tokenEntries,
} from "~/scripts/tokens.mjs";
import { semanticKeys } from "~/tokens/semantic-keys.mjs";

const supported = [
  "color",
  "dimension",
  "duration",
  "fontFamily",
  "fontWeight",
  "number",
  "shadow",
];
const dimension = (v) =>
  isObject(v) && Number.isFinite(v.value) && ["px", "rem"].includes(v.unit);
const color = (v) =>
  isObject(v) &&
  v.colorSpace === "srgb" &&
  Array.isArray(v.components) &&
  v.components.length === 3 &&
  v.components.every((n) => typeof n === "number" && n >= 0 && n <= 1) &&
  (v.alpha === undefined ||
    (typeof v.alpha === "number" && v.alpha >= 0 && v.alpha <= 1));

function authoring(value, path = []) {
  if (!isObject(value))
    return [{ path, message: "Expected a token or group object." }];
  const token = Object.hasOwn(value, "$value");
  return Object.entries(value).flatMap(([key, child]) => {
    if (key.startsWith("$"))
      return ["$value", "$type", "$description"].includes(key)
        ? []
        : [
            {
              path: [...path, key],
              message: "Unsupported authoring property.",
            },
          ];
    if (token || !/^[a-z0-9-]+$/.test(key))
      return [
        {
          path: [...path, key],
          message: "Unsupported token/group name or child of a token.",
        },
      ];
    return authoring(child, [...path, key]);
  });
}

function matches(type, value) {
  switch (type) {
    case "color":
      return color(value);
    case "dimension":
      return dimension(value);
    case "duration":
      return (
        isObject(value) &&
        Number.isFinite(value.value) &&
        value.value >= 0 &&
        ["ms", "s"].includes(value.unit)
      );
    case "fontFamily":
      return (
        (typeof value === "string" && value.length > 0) ||
        (Array.isArray(value) &&
          value.length > 0 &&
          value.every((v) => typeof v === "string" && v.length > 0))
      );
    case "fontWeight":
      return Number.isFinite(value) && value >= 1 && value <= 1000;
    case "number":
      return Number.isFinite(value);
    case "shadow":
      return (
        isObject(value) &&
        color(value.color) &&
        [value.offsetX, value.offsetY, value.blur, value.spread].every(
          dimension,
        ) &&
        (value.inset === undefined || typeof value.inset === "boolean")
      );
    default:
      return false;
  }
}

/** Independent findings; generation never imports this module. */
export function checkTokens(foundation, themes) {
  try {
    const base = tokenEntries(foundation);
    return [
      ...authoring(foundation),
      ...checkValues(base, base),
      ...Object.entries(themes).flatMap(([name, theme]) => {
        try {
          const entries = tokenEntries(theme);
          const supplied = entries.map((entry) => entry.path.join("."));
          return [
            ...authoring(theme, [name]),
            ...(Object.hasOwn(theme, "foundation") ||
            Object.hasOwn(theme, "breakpoint")
              ? [
                  {
                    path: [name],
                    message:
                      "Themes cannot override foundations or breakpoints.",
                  },
                ]
              : []),
            ...semanticKeys
              .filter((key) => !supplied.includes(key))
              .map((key) => ({
                path: [name, ...key.split(".")],
                message: "Missing semantic token.",
              })),
            ...supplied
              .filter((key) => !semanticKeys.includes(key))
              .map((key) => ({
                path: [name, ...key.split(".")],
                message: "Unexpected semantic token.",
              })),
            ...checkValues(entries, [...base, ...entries], [name]),
          ];
        } catch (error) {
          return [{ path: [name], message: error.message }];
        }
      }),
    ];
  } catch (error) {
    return [{ path: [], message: error.message }];
  }
}

function checkValues(entries, context, prefix = []) {
  return entries.flatMap((entry) => {
    const path = [...prefix, ...entry.path];
    try {
      if (!supported.includes(entry.type))
        return [{ path, message: `Unsupported type: ${entry.type}.` }];
      const key = aliasPath(entry.value);
      if (key !== undefined) {
        const target = context.find(
          (candidate) => candidate.path.join(".") === key,
        );
        if (target && target.type !== entry.type)
          return [{ path, message: "Alias type differs from its target." }];
      }
      const value = resolveValue(entry.value, context);
      if (!matches(entry.type, value))
        return [{ path, message: `Invalid ${entry.type} value.` }];
      cssValue(entry.type, value);
      return [];
    } catch (error) {
      return [{ path, message: error.message }];
    }
  });
}
