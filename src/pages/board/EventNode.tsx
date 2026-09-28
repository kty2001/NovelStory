import type { Node, NodeProps } from "@xyflow/react";
import { useNovelStore } from "../../store/novelStore";
import { EVENT_W } from "./flow";

// span = 기간 사건 (폭은 노드 width, 래퍼를 채움)
export type EventNodeType = Node<{ span?: boolean }, "event">;

// 사건 블록 (ui_guide `event-block`): 채색 + 제목. 폭 = 단일 시점 고정 / 기간 사건은 기간 길이
export default function EventNode({ id, data }: NodeProps<EventNodeType>) {
  const item = useNovelStore((s) => s.items[id]);
  const doc = useNovelStore((s) => (item?.kind === "event" ? s.docs[item.docId] : undefined));
  if (item?.kind !== "event") return null;
  return (
    <div
      data-testid="event-block"
      className="rounded-md px-3 py-2 text-block-label break-keep text-ink"
      style={{ width: data.span ? "100%" : EVENT_W, background: `var(--color-${item.color})` }}
    >
      <p className="line-clamp-2">{doc?.title}</p>
    </div>
  );
}
