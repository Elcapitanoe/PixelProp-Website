import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDir = resolve(projectRoot, "dist");
await mkdir(outputDir, { recursive: true });

for (const directory of ["components", "src"]) {
  await cp(
    resolve(projectRoot, directory),
    resolve(outputDir, directory),
    { recursive: true, force: true },
  );
}
