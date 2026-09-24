// 테스트(Playwright)에서 페이지 내부 상태를 읽고 조작하기 위한 전역 훅
declare global {
  interface Window {
    __spike: Record<string, unknown>;
  }
}

export function expose(name: string, api: unknown) {
  window.__spike ??= {};
  window.__spike[name] = api;
}
