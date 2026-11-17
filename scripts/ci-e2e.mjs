// Run the browser suite against the real core's API and the factory simulator. CI checks the
// panel out under a pinned core checkout so the original rig's relative paths work. On Windows
// rig.mjs runs the core in WSL; Node, Vite and Chromium run natively on Windows.
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const node = process.execPath;
const children = [];
const env = { ...process.env, PANEL_URL: "http://127.0.0.1:4173" };

function start(label, args) {
  const child = spawn(node, args, { env, stdio: "inherit" });
  child.on("error", (error) => console.error(`${label}: ${error.message}`));
  children.push(child);
  return child;
}

async function run(label, args) {
  const child = start(label, args);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status));
  });
  if (code !== 0) throw new Error(`${label} exited with ${code}`);
}

async function ready(label, url, child) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${label} exited before it was ready`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await delay(500);
  }
  throw new Error(`${label} did not answer at ${url} within 90 seconds`);
}

try {
  await run("install the rig", ["scripts/rig.mjs", "install"]);
  const rig = start("rig", ["scripts/rig.mjs", "serve"]);
  await ready("rig", "http://127.0.0.1:8788/api/v1/projects", rig);
  await run("seed the rig", ["node_modules/tsx/dist/cli.mjs", "scripts/seed.ts"]);
  const simulator = start("simulator", ["node_modules/tsx/dist/cli.mjs", "sim/server.ts"]);
  await ready("simulator", "http://127.0.0.1:8790/__sim", simulator);
  const panel = start("production panel", ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--strictPort"]);
  await ready("production panel", env.PANEL_URL, panel);
  await run("Playwright", ["node_modules/@playwright/test/cli.js", "test"]);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode === null) child.kill();
  }
}
