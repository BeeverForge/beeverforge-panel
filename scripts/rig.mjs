// Runs scripts/rig.bash where the platform can run: directly on Linux and macOS, and inside WSL on
// Windows (the registry takes a POSIX file lock, so the API does not serve from Windows itself).
import { spawnSync, spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, "rig.bash");
const command = process.argv[2] ?? "serve";
const distro = process.env.PANEL_NEXT_WSL_DISTRO;

function wslPath(windowsPath) {
  const args = [...(distro ? ["-d", distro] : []), "wslpath", "-a", windowsPath.replaceAll("\\", "/")];
  const out = spawnSync("wsl", args, { encoding: "utf8" });
  if (out.status !== 0) {
    console.error(`could not reach WSL to run the rig: ${out.stderr || out.error}`);
    process.exit(1);
  }
  return out.stdout.trim();
}

const [bin, args] =
  process.platform === "win32"
    ? ["wsl", [...(distro ? ["-d", distro] : []), "bash", wslPath(script), command]]
    : ["bash", [script, command]];

const child = spawn(bin, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
