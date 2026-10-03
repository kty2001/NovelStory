import { Fragment, useEffect, useState, type DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { GripVertical, MoreHorizontal, Plus, Route, X } from "lucide-react";
import Button from "../components/Button";
import Dialog from "../components/Dialog";
import EmptyState from "../components/EmptyState";
import Menu from "../components/Menu";
import type { Episode, NarrativeMode, NarrativeSlot } from "../db/types";
import {
  addEpisode,
  addSlot,
  deleteEpisode,
  moveSlot,
  removeSlot,
  renameEpisode,
  setSlotMode,
  setSlotNote,
} from "../store/narrativeActions";
import { useNovelStore } from "../store/novelStore";
import {
  episodeName,
  episodeSlots,
  eventDocsInOrder,
  MODE_LABEL,
  MODES,
  slotCounts,
  sortedEpisodes,
} from "./narrative/narrative";
import { particle } from "../lib/particle";
import { eventBlock, placeText } from "./wiki/boardLinks";
import { useWikiNav } from "./wiki/useWikiNav";
import { commitKeys } from "../lib/keys";

const EVENT_MIME = "application/x-whitenoard-event"; // 사건 목록 → 회차 (문서 ID)
const SLOT_MIME = "application/x-whitenoard-slot"; // 회차 안 · 회차 사이 이동 (슬롯 ID)

const MODE_CLASS: Record<NarrativeMode, string> = {
  linear: "bg-surface-card",
  flashback: "bg-brand-lavender/40",
  flashforward: "bg-brand-mint/50",
  foreshadow: "bg-brand-ochre/40",
  payoff: "bg-brand-coral/30",
};

type DropAt = { episodeId: string; index: number };

const accepts = (e: DragEvent) =>
  e.dataTransfer.types.includes(EVENT_MIME) || e.dataTransfer.types.includes(SLOT_MIME);

// 서술 순서 (F2 1차): 왼쪽 사건 목록(작중 시점순) → 오른쪽 회차에 끌어 배치. 같은 사건 여러 회차 허용
export default function NarrativePage() {
  const novelId = useNovelStore((s) => s.novelId);
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const episodes = useNovelStore((s) => s.episodes);
  const slots = useNovelStore((s) => s.slots);
  const scale = useNovelStore((s) => s.board?.timeScale);
  const [onlyUnnarrated, setOnlyUnnarrated] = useState(false);
  const [dropAt, setDropAt] = useState<DropAt | null>(null);
  const [deleting, setDeleting] = useState<Episode | null>(null);
  const [params] = useSearchParams();
  const focusEpisode = params.get("episode");
  const navigate = useNavigate();
  const { openDoc } = useWikiNav();
  // 보드 서술 비교 (F2 2차): 전체 또는 회차 하나
  const compareOnBoard = (scope: string) => navigate(`/novel/${novelId}/board?compare=${scope}`);

  // 사전 사건 문서 "배치된 회차"에서 이동: 그 회차 카드로 스크롤
  useEffect(() => {
    if (focusEpisode) document.getElementById(`episode-${focusEpisode}`)?.scrollIntoView();
  }, [focusEpisode]);

  if (!scale) return null;
  const events = eventDocsInOrder(items, docs, categories);
  const counts = slotCounts(slots);
  const shown = onlyUnnarrated ? events.filter((e) => !counts[e.doc.id]) : events;
  const list = sortedEpisodes(episodes);
  const timeOf = (docId: string) =>
    placeText(eventBlock(items, docId)?.place, scale) ?? "보드에 없음";

  const drop = (e: DragEvent, episodeId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDropAt(null);
    const docId = e.dataTransfer.getData(EVENT_MIME);
    if (docId) {
      addSlot(episodeId, docId, index);
      return;
    }
    const slot = slots[e.dataTransfer.getData(SLOT_MIME)];
    if (!slot) return;
    // index는 옮기는 슬롯을 포함한 목록 기준 → 같은 회차에서 뒤로 옮길 때 1 당김
    const same = slot.episodeId === episodeId && slot.order < index;
    moveSlot(slot.id, episodeId, same ? index - 1 : index);
  };

  const over = (e: DragEvent, episodeId: string, index: number) => {
    if (!accepts(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(SLOT_MIME) ? "move" : "copy";
    if (dropAt?.episodeId !== episodeId || dropAt.index !== index) setDropAt({ episodeId, index });
  };

  const line = <li aria-hidden className="h-0.5 rounded-full bg-brand-teal" />;

  const slotRow = (slot: NarrativeSlot, i: number, episodeId: string) => {
    const doc = docs[slot.eventDocId];
    return (
      <li
        key={slot.id}
        draggable
        data-testid="slot-row"
        className="group flex cursor-grab items-center gap-2 rounded-sm px-1 py-1 hover:bg-surface-soft"
        onDragStart={(e) => {
          e.dataTransfer.setData(SLOT_MIME, slot.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDropAt(null)}
        onDragOver={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          over(e, episodeId, e.clientY > r.top + r.height / 2 ? i + 1 : i);
        }}
        onDrop={(e) => drop(e, episodeId, dropAt?.episodeId === episodeId ? dropAt.index : i)}
      >
        <GripVertical size={14} className="shrink-0 text-muted-soft" />
        <span className="w-20 shrink-0 truncate text-caption text-muted tabular-nums">
          {timeOf(slot.eventDocId)}
        </span>
        <button
          type="button"
          className="min-w-0 truncate text-left text-body-sm text-ink hover:underline"
          onClick={() => openDoc(slot.eventDocId)}
        >
          {doc?.title || "제목 없음"}
        </button>
        <select
          aria-label="서술 방식"
          value={slot.mode}
          className={`shrink-0 rounded-full px-2 py-0.5 text-caption text-ink ${MODE_CLASS[slot.mode]}`}
          onChange={(e) => setSlotMode(slot.id, e.target.value as NarrativeMode)}
        >
          {MODES.map((m) => (
            <option key={m} value={m}>
              {MODE_LABEL[m]}
            </option>
          ))}
        </select>
        <input
          key={slot.note ?? ""}
          aria-label="공개 범위 메모"
          placeholder="공개 범위 메모"
          defaultValue={slot.note ?? ""}
          className="min-w-0 flex-1 rounded-sm bg-transparent px-1 text-caption text-body placeholder:text-muted-soft focus:bg-canvas"
          onBlur={(e) => setSlotNote(slot.id, e.target.value.trim())}
          onKeyDown={(e) => commitKeys(e, slot.note ?? "")}
        />
        <button
          type="button"
          aria-label="배치 빼기"
          title="이 회차에서 빼기"
          className="shrink-0 rounded-sm p-1 text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-card focus:opacity-100"
          onClick={() => removeSlot(slot.id)}
        >
          <X size={14} />
        </button>
      </li>
    );
  };

  return (
    <div className="mx-auto flex h-full max-w-7xl gap-6 px-6">
      <aside aria-label="사건 목록" className="flex w-72 shrink-0 flex-col py-6">
        <h2 className="text-title-sm text-ink">사건 · {events.length}</h2>
        <p className="mt-1 text-caption text-muted">작중 시점순. 회차로 끌어 놓아 배치</p>
        <label className="mt-3 flex items-center gap-2 text-caption text-body">
          <input
            type="checkbox"
            checked={onlyUnnarrated}
            onChange={(e) => setOnlyUnnarrated(e.target.checked)}
          />
          미서술 사건만
        </label>
        {events.length === 0 ? (
          <EmptyState
            title="아직 사건이 없어요"
            actions={
              <Button onClick={() => navigate(`/novel/${novelId}/board`)}>보드로 가기</Button>
            }
          >
            보드에 사건 블록을 놓으면 여기에 나와요.
          </EmptyState>
        ) : (
          <ul className="mt-2 min-h-0 flex-1 overflow-y-auto">
            {shown.map(({ doc }) => (
              <li
                key={doc.id}
                draggable
                data-testid="event-row"
                title="회차에 끌어 놓아 배치 · 클릭 = 사전 문서"
                className="flex cursor-grab items-center gap-2 rounded-sm px-1 hover:bg-surface-card"
                onDragStart={(e) => {
                  e.dataTransfer.setData(EVENT_MIME, doc.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => setDropAt(null)}
              >
                <GripVertical size={14} className="shrink-0 text-muted-soft" />
                <span className="w-16 shrink-0 truncate text-caption text-muted tabular-nums">
                  {timeOf(doc.id)}
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate py-1.5 text-left text-body-sm text-ink"
                  onClick={() => openDoc(doc.id)}
                >
                  {doc.title || "제목 없음"}
                </button>
                {counts[doc.id] ? (
                  <span className="shrink-0 text-caption text-muted tabular-nums">
                    {counts[doc.id]}회
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-brand-ochre/40 px-1.5 text-caption text-ink">
                    미서술
                  </span>
                )}
              </li>
            ))}
            {shown.length === 0 && (
              <p className="px-1 py-2 text-caption text-muted-soft">모든 사건이 서술됐어요</p>
            )}
          </ul>
        )}
      </aside>

      <section aria-label="회차" className="min-w-0 flex-1 overflow-y-auto py-6">
        {list.length === 0 ? (
          <EmptyState
            boxed
            title="아직 회차가 없어요"
            actions={
              <Button variant="primary" onClick={() => addEpisode()}>
                첫 회차 만들기
              </Button>
            }
          >
            회차를 만들고 왼쪽 사건을 끌어 놓아 독자에게 보여줄 순서를 정해요. 같은 사건을 여러
            회차에 놓을 수 있어요.
          </EmptyState>
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => compareOnBoard("all")}>
                <Route size={14} /> 보드에서 비교
              </Button>
            </div>
            <ol className="flex flex-col gap-3">
              {list.map((ep) => {
                const inEp = episodeSlots(slots, ep.id);
                const at = dropAt?.episodeId === ep.id ? dropAt.index : -1;
                return (
                  <li
                    key={ep.id}
                    id={`episode-${ep.id}`}
                    aria-label={episodeName(ep)}
                    data-testid="episode"
                    className={`rounded-md border px-4 py-3 ${ep.id === focusEpisode ? "border-brand-teal" : "border-hairline"}`}
                    onDragOver={(e) => over(e, ep.id, inEp.length)}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null);
                    }}
                    onDrop={(e) => drop(e, ep.id, inEp.length)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-title-sm text-ink tabular-nums">
                        {ep.number}화
                      </span>
                      <input
                        key={ep.title ?? ""}
                        aria-label={`${ep.number}화 제목`}
                        placeholder="제목 없음"
                        defaultValue={ep.title ?? ""}
                        className="min-w-0 flex-1 rounded-sm bg-transparent px-1 text-title-sm text-ink placeholder:font-normal placeholder:text-muted-soft focus:bg-surface-soft"
                        onBlur={(e) => renameEpisode(ep.id, e.target.value)}
                        onKeyDown={(e) => commitKeys(e, ep.title ?? "")}
                      />
                      <span className="text-caption text-muted">{inEp.length}개</span>
                      <Menu
                        label={`${ep.number}화 메뉴`}
                        trigger={<MoreHorizontal size={16} />}
                        items={[
                          { label: "앞에 회차 삽입", onSelect: () => addEpisode(ep.id) },
                          { label: "보드에서 비교", onSelect: () => compareOnBoard(ep.id) },
                          {
                            label: "회차 삭제",
                            danger: true,
                            onSelect: () => (inEp.length ? setDeleting(ep) : deleteEpisode(ep.id)),
                          },
                        ]}
                      />
                    </div>
                    <ul className="mt-2">
                      {inEp.map((slot, i) => (
                        <Fragment key={slot.id}>
                          {at === i && line}
                          {slotRow(slot, i, ep.id)}
                        </Fragment>
                      ))}
                      {at === inEp.length && inEp.length > 0 && line}
                    </ul>
                    {inEp.length === 0 && (
                      <p
                        className={`rounded-sm border border-dashed px-3 py-3 text-center text-caption text-muted ${at === 0 ? "border-brand-teal" : "border-hairline"}`}
                      >
                        사건을 끌어 놓으세요
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <Button className="mt-3" onClick={() => addEpisode()}>
              <Plus size={16} /> 회차
            </Button>
          </>
        )}
      </section>

      {deleting && (
        <Dialog
          open
          onClose={() => setDeleting(null)}
          title={`${episodeName(deleting)}${particle(episodeName(deleting), "을", "를")} 삭제할까요?`}
          footer={
            <>
              <Button onClick={() => setDeleting(null)}>취소</Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteEpisode(deleting.id);
                  setDeleting(null);
                }}
              >
                삭제
              </Button>
            </>
          }
        >
          <p className="text-body-sm">
            배치된 사건 {episodeSlots(slots, deleting.id).length}개도 이 회차에서 빠져요. 사건
            문서는 그대로예요. 뒤 회차 번호는 하나씩 당겨져요.
          </p>
        </Dialog>
      )}
    </div>
  );
}
