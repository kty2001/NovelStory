import type { BoardEdge, BoardItem, TimeScale, WikiDoc } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { shifted } from "./flow";

// 보드 복사 · 붙여넣기 (UC-20). 클립보드는 열려 있는 소설의 보드 안에서만 사용
export type Clip = {
  items: BoardItem[];
  edges: BoardEdge[];
  docs: WikiDoc[]; // 사건 블록의 문서 (1:1 유지를 위해 붙여넣을 때 복제)
  center: { x: number; y: number }; // 복사한 요소 묶음의 가운데 (마우스 위치에 붙여넣기)
};

// 선택 요소 + 선택한 프레임의 자식 + 양 끝이 모두 포함된 연결선
export function copyClip(
  ids: string[],
  items: Collection<BoardItem>,
  edges: Collection<BoardEdge>,
  docs: Collection<WikiDoc>,
  center: { x: number; y: number },
): Clip | null {
  const picked = new Set(ids.filter((id) => items[id]));
  for (const i of Object.values(items)) {
    if (i.parentFrameId && picked.has(i.parentFrameId)) picked.add(i.id);
  }
  if (!picked.size) return null;
  const list = [...picked].map((id) => items[id]);
  return {
    items: list,
    edges: Object.values(edges).filter((e) => picked.has(e.source) && picked.has(e.target)),
    docs: list.flatMap((i) => (i.kind === "event" && docs[i.docId] ? [docs[i.docId]] : [])),
    center,
  };
}

type PasteCtx = {
  novelId: string;
  scale: TimeScale;
  snap: boolean;
  zStart: number;
  now: string;
  newId: () => string;
};

// 붙여넣을 새 레코드: 새 ID, (dx, dy) 이동(시간 블록은 눈금 재계산), 맨 위 z, 프레임 소속 · 관련 사건 · 연결선을
// 새 ID로 다시 연결 (복사에 없는 프레임 소속은 해제), 사건 문서는 복제 (태그 · 라인 포함)
export function pasteRecords(clip: Clip, dx: number, dy: number, ctx: PasteCtx) {
  const ids = new Map(clip.items.map((i) => [i.id, ctx.newId()]));
  const docIds = new Map(clip.docs.map((d) => [d.id, ctx.newId()]));
  const docs: WikiDoc[] = clip.docs.map((d) => ({
    ...d,
    id: docIds.get(d.id)!,
    novelId: ctx.novelId,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  }));
  // 원래 z 순서를 유지한 채 맨 위로
  const byZ = [...clip.items].sort((a, b) => a.z - b.z);
  const items = byZ.map((src, n): BoardItem => {
    const place = shifted(src, dx, dy, ctx.scale, ctx.snap);
    const next = {
      ...src,
      id: ids.get(src.id)!,
      novelId: ctx.novelId,
      updatedAt: ctx.now,
      z: ctx.zStart + n,
      place,
    } as BoardItem & Record<string, unknown>;
    const parent = src.parentFrameId && ids.get(src.parentFrameId);
    if (parent) next.parentFrameId = parent;
    else delete next.parentFrameId;
    if (next.kind === "event") next.docId = docIds.get(next.docId) ?? next.docId;
    if (next.kind === "state" && next.linkedEventItemId) {
      next.linkedEventItemId = ids.get(next.linkedEventItemId) ?? next.linkedEventItemId;
    }
    return next;
  });
  const edges: BoardEdge[] = clip.edges.map((e) => ({
    ...e,
    id: ctx.newId(),
    novelId: ctx.novelId,
    updatedAt: ctx.now,
    source: ids.get(e.source)!,
    target: ids.get(e.target)!,
  }));
  return { items, edges, docs };
}
