/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Cloudflare 플러그인은 Vitest 서버와 충돌해 테스트 시 제외
  plugins: [react(), tailwindcss(), !process.env.VITEST && cloudflare()],
  server: { port: 5173, strictPort: true },
  test: { include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["fake-indexeddb/auto"] },
});
