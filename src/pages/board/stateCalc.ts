import { getChoseong } from "es-hangul";
import type { BoardItem, StateItem, WikiCategory, WikiDoc } from "../../db/types";
import { propText } from "../../db/wikiDerived";
import type { Collection } from "../../store/novelStore";

// 캐릭터 상태 계산 (data_model 4.4)

const timedStates = (items: Collection<BoardItem>, docId: string) =>
  Object.values(items).filter(
    (i): i is StateItem & { place: { mode: "timed" } } =>
      i.kind === "state" && i.docId === docId && i.place.mode === "timed",
  );

// 같은 시점이면 y, 그다음 z 순서
const byTime = (a: StateItem, b: StateItem) => {
  const ta = a.place.mode === "timed" ? a.place.t : 0;
  const tb = b.place.mode === "timed" ? b.place.t : 0;
  return ta - tb || a.place.y - b.place.y || a.z - b.z;
};

// 시점 t까지의 상태: 캐릭터 문서 props 위에, 시점 ≤ t 상태 블록의 changes(`to`)를 순서대로 덮어씀.
// 미정 블록 · 제외할 블록(입력 중인 자기 자신)은 빼고 계산
export function stateAt(
  docId: string,
  t: number,
  items: Collection<BoardItem>,
  docs: Collection<WikiDoc>,
  excludeId?: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of docs[docId]?.props ?? []) if (p.value) out[p.key] = propText(p, docs);
  const blocks = timedStates(items, docId)
    .filter((s) => s.id !== excludeId && Math.round(s.place.t) <= Math.round(t))
    .sort(byTime);
  for (const s of blocks) for (const c of s.changes) out[c.key] = c.to;
  return out;
}

// 시점 선택 보기 후보: 캐릭터들의 시점 있는 상태 블록 눈금 (중복 제거, 오름차순)
export function stateTicks(items: Collection<BoardItem>, docIds: Set<string>): number[] {
  const ticks = Object.values(items).flatMap((i) =>
    i.kind === "state" && docIds.has(i.docId) && i.place.mode === "timed"
      ? [Math.round(i.place.t)]
      : [],
  );
  return [...new Set(ticks)].sort((a, b) => a - b);
}

// 같은 캐릭터가 이 블록보다 앞선 시점에 퇴장했는지 (막지 않고 경고만, UC-12)
export function afterExit(item: StateItem, items: Collection<BoardItem>): boolean {
  if (item.place.mode !== "timed") return false;
  const t = item.place.t;
  return timedStates(items, item.docId).some(
    (s) => s.id !== item.id && s.stateType === "exit" && s.place.t < t,
  );
}

// system 분류와 그 하위 분류 ID (사건 계열 · 캐릭터 계열)
export function categoryFamily(
  categories: Collection<WikiCategory>,
  system: NonNullable<WikiCategory["system"]>,
): Set<string> {
  const all = Object.values(categories);
  const family = new Set(all.filter((c) => c.system === system).map((c) => c.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) {
      if (c.parentId && family.has(c.parentId) && !family.has(c.id)) {
        family.add(c.id);
        grew = true;
      }
    }
  }
  return family;
}

const CHOSEONG_ONLY = /^[ㄱ-ㅎ\s]+$/;

// 일치 위치 (없으면 -1): 부분 일치(대소문자 무시), 검색어가 초성뿐이면 글자별 초성 일치.
// 음절 → 초성 1:1 치환이라 위치 · 길이는 원문 그대로 (일치 부분 강조용)
export function matchAt(text: string, query: string): number {
  const q = query.trim().toLowerCase();
  const i = text.toLowerCase().indexOf(q);
  if (i >= 0 || !CHOSEONG_ONLY.test(q)) return i;
  return text.replace(/[가-힣]/g, (c) => getChoseong(c)).indexOf(q);
}

// 문서 검색: 제목 · 별칭 부분 일치 또는 초성 일치
export function searchDocs(docs: WikiDoc[], query: string): WikiDoc[] {
  if (!query.trim()) return docs;
  return docs.filter(
    (d) => matchAt(d.title, query) >= 0 || d.aliases.some((a) => matchAt(a, query) >= 0),
  );
}
