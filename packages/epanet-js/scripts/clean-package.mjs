/**
 * Temporarily replaces package.json with a publish-safe version during pnpm pack.
 *
 * Usage (via prepack / postpack lifecycle hooks):
 *   node scripts/clean-package.mjs save     # called by prepack
 *   node scripts/clean-package.mjs restore  # called by postpack
 *
 * "save"    – backs up the original package.json and writes a cleaned copy:
 *               • removes "scripts"
 *               • removes "devDependencies"
 *               • removes the "@epanet-js/epanet-engine" workspace dependency
 * "restore" – atomically renames the backup back to package.json.
 */

import { readFileSync, writeFileSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const pkgPath = join(pkgRoot, "package.json");
const bakPath = join(pkgRoot, "package.json.bak");

const [, , command] = process.argv;

if (command === "save") {
  const original = readFileSync(pkgPath, "utf8");

  // Keep the backup so "restore" can reinstate the exact original bytes.
  writeFileSync(bakPath, original);

  const pkg = JSON.parse(original);

  // Strip workspace-only fields.
  const { scripts, devDependencies, dependencies, ...rest } = pkg;

  // Drop the internal workspace dep; preserve any real external deps.
  const filteredDeps = { ...(dependencies ?? {}) };
  delete filteredDeps["@epanet-js/epanet-engine"];

  const cleanPkg = {
    ...rest,
    ...(Object.keys(filteredDeps).length > 0
      ? { dependencies: filteredDeps }
      : {}),
  };

  writeFileSync(pkgPath, JSON.stringify(cleanPkg, null, 2) + "\n");
  console.log("prepack: package.json cleaned for publishing.");
} else if (command === "restore") {
  renameSync(bakPath, pkgPath);
  console.log("postpack: package.json restored.");
} else {
  console.error(`Usage: clean-package.mjs <save|restore>`);
  process.exit(1);
}
