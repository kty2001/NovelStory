/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Cloudflare 플러그인은 Vitest 서버와 충돌해 테스트 시 제외
  plugins: [react(), tailwindcss(), !process.env.VITEST && cloudflare()],
  server: {
    port: 5173,
    strictPort: true,
    // 지연 로드 화면(router.tsx)을 개발 서버 시작 때 미리 변환 → 첫 탭 이동 지연 방지
    warmup: { clientFiles: ["./src/pages/BoardPage.tsx", "./src/pages/WikiPage.tsx"] },
  },
  test: { include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["fake-indexeddb/auto"] },
});
