import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8787";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/auth/register": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/auth/login": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/mcp": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
