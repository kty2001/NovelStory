import { db } from "./db";

// 첫 소설이 생기는 순간 1회 요청 (UC-01). 새 사이트에선 대부분 거부되므로 결과와 무관하게 흐름을 막지 않음
export async function requestPersistOnce() {
  try {
    if (await db.meta.get("persist")) return;
    const granted = (await navigator.storage?.persist?.()) ?? false;
    await db.meta.put({ key: "persist", requestedAt: new Date().toISOString(), granted });
  } catch (err) {
    console.warn("persist() 요청 실패", err);
  }
}
