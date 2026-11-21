import { runPackage, waitForExit } from "./run-package.mjs";

const children = [runPackage("backend", "dev"), runPackage("frontend", "dev")];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
const code = await Promise.race(children.map(waitForExit));
stop();
process.exitCode = code;
