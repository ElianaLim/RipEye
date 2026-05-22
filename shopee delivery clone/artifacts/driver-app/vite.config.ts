import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const workspaceRoot = path.resolve(import.meta.dirname, "../..");
  const env = loadEnv(mode, workspaceRoot, "");
  const rawPort = env.PORT ?? process.env.PORT ?? "3001";
  const apiPort = Number(rawPort);
  const apiTarget =
    env.VITE_API_URL ?? `http://127.0.0.1:${Number.isNaN(apiPort) ? 3001 : apiPort}`;

  const devPort = Number(env.VITE_PORT ?? process.env.VITE_PORT ?? "5173");
  const port = Number.isNaN(devPort) || devPort <= 0 ? 5173 : devPort;
  const basePath = env.BASE_PATH ?? process.env.BASE_PATH ?? "/";

  return {
    envDir: workspaceRoot,
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "localhost",
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "localhost",
    },
  };
});
