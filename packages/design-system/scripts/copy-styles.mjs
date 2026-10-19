import { copyFile } from "node:fs/promises";
for (const name of ["tokens", "tailwind"]) {
  await copyFile(
    new URL(`../src/styles/generated/${name}.css`, import.meta.url),
    new URL(`../dist/${name}.css`, import.meta.url),
  );
}
await copyFile(
  new URL("../src/styles/reset.css", import.meta.url),
  new URL("../dist/reset.css", import.meta.url),
);
