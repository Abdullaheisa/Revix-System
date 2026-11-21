import { runPackage, waitForExit } from "./run-package.mjs";

for (const [directory, script] of [
  ["backend", "typecheck"],
  ["frontend", "typecheck"],
  ["frontend", "lint"],
  ["backend", "test"],
  ["frontend", "test"],
]) {
  console.log(`\nChecking ${directory}: ${script}`);
  const code = await waitForExit(runPackage(directory, script));
  if (code !== 0) process.exit(code);
}
