import { db } from "./db";

// 저장 공간 (UC-42)

// 공간 부족: QuotaExceededError (Dexie가 트랜잭션 중단 오류로 감싸면 inner)
export function isQuotaError(err: unknown): boolean {
  for (let e = err; e && typeof e === "object"; e = (e as { inner?: unknown }).inner) {
    if ((e as { name?: unknown }).name === "QuotaExceededError") return true;
  }
  return false;
}

// 이 사이트 사용량 · 할당량 (지원하지 않거나 실패하면 null)
export async function storageUsage(): Promise<{ usage: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.quota) return null;
    return { usage: est.usage ?? 0, quota: est.quota };
  } catch {
    return null;
  }
}

// 소설별 이미지 수 · 용량 합 (이미지가 있는 소설만, 용량 큰 순)
export async function imageUsageByNovel(): Promise<
  { novelId: string; count: number; bytes: number }[]
> {
  const sums = new Map<string, { count: number; bytes: number }>();
  await db.images.each((img) => {
    const s = sums.get(img.novelId) ?? { count: 0, bytes: 0 };
    sums.set(img.novelId, { count: s.count + 1, bytes: s.bytes + img.bytes });
  });
  return [...sums].map(([novelId, s]) => ({ novelId, ...s })).sort((a, b) => b.bytes - a.bytes);
}

// 1.8 GB · 620 MB · 12 KB
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i >= 3 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}
