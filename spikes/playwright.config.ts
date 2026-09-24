import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: { baseURL: "http://localhost:5173" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /c3-perf/,
    },
    {
      // C3 성능: GPU 렌더링이 필요해 화면 표시 모드, 개발 모드 오버헤드를 피해 프로덕션 빌드(preview)로 측정
      name: "perf",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        viewport: { width: 1440, height: 900 },
        baseURL: "http://localhost:4173",
      },
      testMatch: /c3-perf/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      grep: /@webkit/,
    },
  ],
  webServer: [
    { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
    {
      command: "npm run build && npx vite preview --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
