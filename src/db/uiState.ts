import { db } from "./db";
import type { UiState } from "./types";

// 로컬 전용 화면 상태: 자동 저장·실행 취소와 무관하게 바로 기록
export async function patchUiState(novelId: string, patch: Partial<Omit<UiState, "novelId">>) {
  await db.transaction("rw", db.uiState, async () => {
    const current = (await db.uiState.get(novelId)) ?? {
      novelId,
      viewport: { x: 0, y: 0, zoom: 1 },
      lastTab: "board" as const,
    };
    await db.uiState.put({ ...current, ...patch });
  });
}
