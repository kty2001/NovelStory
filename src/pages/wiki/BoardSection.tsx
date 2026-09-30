import type { ReactNode } from "react";
import EmptyState from "../../components/EmptyState";
import type { WikiDoc } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { docEpisodes, MODE_LABEL } from "../narrative/narrative";
import {
  characterEvents,
  eventBlock,
  placeText,
  relatedCharacters,
  stateHistory,
  stateText,
} from "./boardLinks";
import { blockCount, familyOf } from "./categories";
import { useWikiNav } from "./useWikiNav";

function Row({ at, children, onClick }: { at: string; children: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-body-sm text-ink hover:bg-surface-soft"
        onClick={onClick}
      >
        <span className="w-16 shrink-0 text-caption text-muted tabular-nums">{at}</span>
        {children}
      </button>
    </li>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <h4 className="mb-1 text-caption font-semibold text-muted">{children}</h4>
);

// 보드 연동 (W-1 ⑧ · W-2, 자동 · 편집 불가): 캐릭터 = 등장 사건 · 상태 변화 이력,
// 사건 = 작중 시점 · 관련 캐릭터 · 배치된 회차. 항목 클릭 → 보드에서 그 블록 / 서술 탭 그 회차로
export default function BoardSection({ doc }: { doc: WikiDoc }) {
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const lines = useNovelStore((s) => s.lines);
  const categories = useNovelStore((s) => s.categories);
  const scale = useNovelStore((s) => s.board?.timeScale);
  const episodes = useNovelStore((s) => s.episodes);
  const slots = useNovelStore((s) => s.slots);
  const { openBoard, openDoc, openEpisode, inPanel } = useWikiNav();
  const family = familyOf(categories, doc.categoryId);
  if (!scale || (family !== "character" && family !== "event")) return null;

  let body: ReactNode;
  // 보드 연동 0 (W-7): 끌어 배치 안내
  if (!blockCount(items, doc.id)) {
    body = (
      <EmptyState title="보드에 아직 없어요">
        {inPanel
          ? "위 '보드로 끌기' 손잡이를 보드에 끌어 놓으면 배치돼요"
          : "보드에서 이 문서를 사전 패널로 열어 '보드로 끌기'로 배치할 수 있어요"}
      </EmptyState>
    );
  } else if (family === "event") {
    const block = eventBlock(items, doc.id);
    const chars = relatedCharacters(items, docs, doc.id);
    body = (
      <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-caption text-muted">작중 시점</dt>
        <dd>
          {block ? (
            <button
              type="button"
              className="text-ink tabular-nums hover:underline"
              onClick={() => openBoard(block.id)}
            >
              {placeText(block.place, scale)}
            </button>
          ) : (
            <span className="text-muted">보드에 아직 없어요</span>
          )}
        </dd>
        <dt className="text-caption text-muted">관련 캐릭터</dt>
        <dd className="flex flex-wrap gap-1.5">
          {chars.map((c) => (
            <button
              key={c.id}
              type="button"
              className="rounded-xs bg-surface-card px-1.5 text-ink hover:bg-surface-strong"
              onClick={() => openDoc(c.id)}
            >
              {c.title}
            </button>
          ))}
          {chars.length === 0 && <span className="text-muted">없음</span>}
        </dd>
      </dl>
    );
  } else {
    const evs = characterEvents(items, doc.id);
    const history = stateHistory(items, doc.id);
    body = (
      <div className="grid grid-cols-2 gap-8">
        <div>
          <Label>등장 사건</Label>
          <ul>
            {evs.map((e) => {
              const ev = docs[e.docId];
              const line = ev?.lineId ? lines[ev.lineId] : undefined;
              return (
                <Row
                  key={e.id}
                  at={placeText(e.place, scale) ?? ""}
                  onClick={() => openBoard(e.id)}
                >
                  <span className="truncate">{ev?.title}</span>
                  {line && (
                    <span className="rounded-full bg-surface-card px-2 text-caption">
                      {line.name}
                    </span>
                  )}
                </Row>
              );
            })}
          </ul>
          {evs.length === 0 && <p className="px-2 text-body-sm text-muted">없음</p>}
        </div>
        <div>
          <Label>상태 변화 이력</Label>
          <ul>
            {history.map((s) => (
              <Row key={s.id} at={placeText(s.place, scale) ?? ""} onClick={() => openBoard(s.id)}>
                <span className="truncate">{stateText(s)}</span>
              </Row>
            ))}
          </ul>
          {history.length === 0 && (
            <p className="px-2 text-body-sm text-muted">보드에 아직 없어요</p>
          )}
        </div>
      </div>
    );
  }

  const placedIn = docEpisodes(slots, episodes, doc.id);
  return (
    <section aria-label="보드 연동" className="mt-12 border-t border-hairline pt-6">
      <h3 className="mb-3 flex items-center gap-2 text-title-sm text-ink">
        보드 연동 <span className="text-caption text-muted">자동 표시</span>
      </h3>
      {body}
      {family === "event" && (
        <div className="mt-4">
          <Label>배치된 회차</Label>
          <ul>
            {placedIn.map(({ slot, episode }) => (
              <Row key={slot.id} at={`${episode.number}화`} onClick={() => openEpisode(episode.id)}>
                <span className="truncate">{episode.title}</span>
                <span className="rounded-full bg-surface-card px-2 text-caption">
                  {MODE_LABEL[slot.mode]}
                </span>
              </Row>
            ))}
          </ul>
          {!placedIn.length && (
            <p className="px-2 text-body-sm text-muted">아직 서술에 쓰이지 않았어요</p>
          )}
        </div>
      )}
    </section>
  );
}
