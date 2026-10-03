import type { BoardItem, Episode, EventItem, NarrativeSlot } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { eventBlock } from "../wiki/boardLinks";
import { episodeSlots, sortedEpisodes } from "./narrative";

// 보드 비교 오버레이 (F2 2차): 서술 순서대로 사건 블록을 잇는 읽기 경로

export type CompareScope = "all" | string; // 전체 또는 회차 ID

export type Step = {
  slot: NarrativeSlot;
  episode: Episode;
  index: number; // 회차 안 순번 (1부터)
  block?: EventItem; // 보드에 없는 사건이면 없음
};
type Placed = Step & { block: EventItem };

// 정방향 · 의도된 역행(회상 도착 · 예고에서 복귀) · 역행(표시 누락 의심)
export type SegmentKind = "forward" | "intended" | "reverse";
export type Segment = { from: Placed; to: Placed; kind: SegmentKind };

// 회차 번호 → 회차 안 순서
export function readingSteps(
  episodes: Collection<Episode>,
  slots: Collection<NarrativeSlot>,
  items: Collection<BoardItem>,
  scope: CompareScope,
): Step[] {
  return sortedEpisodes(episodes)
    .filter((e) => scope === "all" || e.id === scope)
    .flatMap((episode) =>
      episodeSlots(slots, episode.id).map((slot, i) => ({
        slot,
        episode,
        index: i + 1,
        block: eventBlock(items, slot.eventDocId),
      })),
    );
}

// 시작 눈금. 미정 영역은 판정 제외
const tickOf = (s: Placed) => (s.block.place.mode === "timed" ? s.block.place.t : null);

function segmentKind(from: Placed, to: Placed): SegmentKind {
  const a = tickOf(from);
  const b = tickOf(to);
  if (a === null || b === null || b >= a) return "forward";
  return to.slot.mode === "flashback" || from.slot.mode === "flashforward" ? "intended" : "reverse";
}

// 보이는 블록이 있는 배치끼리 연속 쌍 (숨긴 블록은 건너뛰고 앞뒤 연결, 같은 블록 연속은 생략)
export function pathSegments(steps: Step[], hiddenIds: ReadonlySet<string>): Segment[] {
  const visible = steps.filter((s): s is Placed => !!s.block && !hiddenIds.has(s.block.id));
  return visible.flatMap((to, i) => {
    const from = visible[i - 1];
    if (!from || from.block.id === to.block.id) return [];
    return [{ from, to, kind: segmentKind(from, to) }];
  });
}

const stepLabel = (s: Step) => `${s.episode.number}화·${s.index}`;

// 블록 ID → 순번 배지 (서술 순서)
export function stepLabels(steps: Step[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of steps) {
    if (!s.block) continue;
    out.set(s.block.id, [...(out.get(s.block.id) ?? []), stepLabel(s)]);
  }
  return out;
}

// 범위 안에서 서술된 사건 문서 (나머지 사건 블록은 흐리게)
export const narratedDocIds = (steps: Step[]) => new Set(steps.map((s) => s.slot.eventDocId));

type Box = { x: number; y: number; w: number; h: number };

const MIN_LIFT = 70;

// 경로 곡선: 출발 블록 윗변의 진행 방향 쪽 ¼ 지점 → 도착 블록 윗변의 들어오는 쪽 ¼ 지점.
// 들어오는 선 · 나가는 선이 다른 점을 쓰고, 가까운 블록도 최소 높이로 위로 휨 (역행은 더 높게)
export function arcPath(from: Box, to: Box, kind: SegmentKind) {
  const right = to.x + to.w / 2 >= from.x + from.w / 2;
  const sx = from.x + from.w * (right ? 0.75 : 0.25);
  const ex = to.x + to.w * (right ? 0.25 : 0.75);
  const [sy, ey] = [from.y, to.y];
  const lift =
    Math.max(MIN_LIFT, 40 + Math.min(Math.abs(ex - sx) * 0.2, 160)) *
    (kind === "forward" ? 1 : 1.6);
  const cx = (sx + ex) / 2;
  const cy = Math.min(sy, ey) - lift;
  return { sx, sy, ex, ey, cx, cy, d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}` };
}

// 배지 칩: 2개까지 그대로, 3개 이상은 첫 라벨 + "+N"
export const badgeChips = (labels: string[]) =>
  labels.length <= 2 ? labels : [labels[0], `+${labels.length - 1}`];
