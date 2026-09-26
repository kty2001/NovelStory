import { importExport } from "../../db/novelExport";

// 빈 서재 샘플 카드 (onboarding 4장). 개수는 sample.test.ts가 실제 파일과 대조
export const SAMPLE = {
  url: "/samples/sample.whitenoard.json",
  title: "잿빛 왕관 (샘플)",
  genre: "판타지",
  events: 8,
  docs: 14,
};

export async function importSample() {
  const res = await fetch(SAMPLE.url);
  if (!res.ok) throw new Error(`샘플을 불러오지 못함: ${res.status}`);
  return importExport(await res.json());
}
