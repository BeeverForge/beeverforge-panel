import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Where the API is. By default the factory simulator (npm run sim), which answers the engine's
// routes itself and passes the rest to the rig; `--mode live` reads .env.live and points at a real
// deployment instead. The browser only ever talks to this dev server, so the panel stays
// same-origin: the credential cookie and both sockets work exactly as they do when the API serves
// the page itself.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "PANEL_");
  const api = env.PANEL_API ?? "http://127.0.0.1:8790";
  const proxied = { target: api, changeOrigin: true };
  return {
    plugins: [react()],
    server: {
      port: Number(env.PANEL_PORT ?? 5173),
      strictPort: true,
      proxy: {
        "/api": { ...proxied, ws: true },
        "/auth": proxied,
        "/healthz": proxied,
        "/readyz": proxied,
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": { ...proxied, ws: true },
        "/auth": proxied,
      },
    },
    build: {
      target: "es2022",
      manifest: true,
      sourcemap: true,
    },
  };
});
