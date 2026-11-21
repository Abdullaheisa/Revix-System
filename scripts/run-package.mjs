import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export function runPackage(directory, script) {
  if (!process.env.npm_execpath) throw new Error("Run this script through npm.");
  return spawn(process.execPath, [process.env.npm_execpath, "run", script], {
    cwd: fileURLToPath(new URL(`../${directory}/`, import.meta.url)),
    stdio: "inherit",
    env: process.env,
  });
}

export function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}
