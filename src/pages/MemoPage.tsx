import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { FileText, MoreHorizontal, Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import Button from "../components/Button";
import Dialog from "../components/Dialog";
import EmptyState from "../components/EmptyState";
import Menu from "../components/Menu";
import Toast from "../components/Toast";
import { db } from "../db/db";
import { UNDO_MS } from "../db/novels";
import type { Memo } from "../db/types";
import { relativeTime } from "../lib/relativeTime";
import {
  addMemo,
  deleteMemos,
  memoToDoc,
  memoToSticky,
  restoreMemos,
  setMemoBody,
  setMemoPinned,
} from "../store/memoActions";
import { useNovelStore } from "../store/novelStore";
import { deleteDoc } from "../store/wikiActions";
import { sortedMemos } from "./memo/memo";
import { flatCategories } from "./wiki/categories";
import { useWikiNav } from "./wiki/useWikiNav";

const STICKY_SIZE = 160;
const HEADER_H = 56; // 작업공간 상단 바 (보드 화면 가운데 근사용)

type Notice = { text: string; actions: { label: string; run: () => void }[] };

// 메모 → 사전 문서: 분류 선택 (트리 순서, DocView 분류 이동과 같은 목록)
function ToDocDialog({
  onPick,
  onClose,
}: {
  onPick: (categoryId: string) => void;
  onClose: () => void;
}) {
  const categories = useNovelStore((s) => s.categories);
  return (
    <Dialog open onClose={onClose} title="사전 문서로 옮기기">
      <p className="mb-2 text-caption text-muted">
        첫 줄이 제목, 나머지가 본문이 돼요. 넣을 분류를 고르세요.
      </p>
      <ul className="max-h-80 overflow-y-auto">
        {flatCategories(categories).map(({ category: c, depth }) => (
          <li key={c.id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm py-2 pr-2 text-left text-body-sm text-ink hover:bg-surface-card"
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => onPick(c.id)}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--color-${c.color})` }}
              />
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

// 메모 (F5, UC-52): 정리 전 아이디어 목록. 고정 → 최근 수정순, 포스트잇 · 사전 문서로 옮기기
export default function MemoPage() {
  const { novelId } = useParams();
  const memos = useNovelStore((s) => s.memos);
  const [params] = useSearchParams();
  const { openDoc, openBoard } = useWikiNav();
  const memoParam = params.get("memo");
  const [addedId, setAddedId] = useState<string | null>(null);
  const focusId = addedId ?? memoParam; // 강조 · 입력 포커스
  const [toDoc, setToDoc] = useState<Memo | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // 순서는 추가 · 삭제 · 고정 변경 때만 다시 계산 (입력 중 카드가 튀지 않게)
  const shape = Object.values(memos)
    .map((m) => m.id + (m.pinned ? "+" : ""))
    .sort()
    .join();
  const order = useMemo(
    () => sortedMemos(useNovelStore.getState().memos).map((m) => m.id),
    [shape], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const list = order.flatMap((id) => (memos[id] ? [memos[id]] : []));
  const pinned = list.filter((m) => m.pinned);
  const rest = list.filter((m) => !m.pinned);

  // 보드 → 메모 변환 후 "메모 보기" (?memo=) : 그 카드로 스크롤
  useEffect(() => {
    if (memoParam)
      document.getElementById(`memo-${memoParam}`)?.scrollIntoView({ block: "center" });
  }, [memoParam]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const add = () => setAddedId(addMemo());

  const remove = (memo: Memo) => {
    deleteMemos([memo.id]);
    setNotice({
      text: "메모 삭제됨",
      actions: [{ label: "되돌리기", run: () => restoreMemos([memo]) }],
    });
  };

  // 마지막으로 보던 보드 화면 가운데에 포스트잇 → 보드에서 선택 · 화면 이동
  const toSticky = async (memo: Memo) => {
    if (!novelId) return;
    const vp = (await db.uiState.get(novelId))?.viewport;
    const w = window.innerWidth;
    const h = window.innerHeight - HEADER_H;
    const { x, y, zoom } = vp ?? { x: w / 2, y: h / 2, zoom: 1 };
    const id = memoToSticky(
      memo.id,
      Math.round((w / 2 - x) / zoom - STICKY_SIZE / 2),
      Math.round((h / 2 - y) / zoom - STICKY_SIZE / 2),
    );
    if (id) openBoard(id);
  };

  const pickCategory = (categoryId: string) => {
    const memo = toDoc;
    setToDoc(null);
    if (!memo) return;
    const docId = memoToDoc(memo.id, categoryId);
    if (!docId) return;
    const title = useNovelStore.getState().docs[docId]?.title ?? "";
    setNotice({
      text: `'${title}' 문서로 옮김`,
      actions: [
        { label: "열기", run: () => openDoc(docId) },
        {
          label: "되돌리기",
          run: () => {
            deleteDoc(docId);
            restoreMemos([memo]);
          },
        },
      ],
    });
  };

  const card = (memo: Memo) => (
    <li
      key={memo.id}
      id={`memo-${memo.id}`}
      data-testid="memo"
      className={`rounded-md border bg-canvas px-4 pt-3 pb-2 ${memo.id === focusId ? "border-brand-teal" : "border-hairline"}`}
    >
      <textarea
        aria-label="메모 내용"
        placeholder="떠오른 생각을 적어 두세요"
        value={memo.body}
        autoFocus={memo.id === focusId}
        className="field-sizing-content min-h-16 w-full resize-none bg-transparent text-body text-ink placeholder:text-muted-soft focus:outline-none"
        onChange={(e) => setMemoBody(memo.id, e.target.value)}
      />
      <div className="flex items-center gap-1 text-caption text-muted">
        <span>{relativeTime(memo.updatedAt)}</span>
        <button
          type="button"
          aria-label={memo.pinned ? "고정 해제" : "고정"}
          aria-pressed={memo.pinned}
          title={memo.pinned ? "고정 해제" : "맨 위에 고정"}
          className={`ml-auto flex size-7 items-center justify-center rounded-sm hover:bg-surface-card ${memo.pinned ? "text-ink" : ""}`}
          onClick={() => setMemoPinned(memo.id, !memo.pinned)}
        >
          {memo.pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
        <Menu
          label="메모 메뉴"
          trigger={<MoreHorizontal size={16} />}
          items={[
            {
              label: "보드에 포스트잇으로",
              icon: <StickyNote size={14} />,
              onSelect: () => void toSticky(memo),
            },
            { label: "사전 문서로…", icon: <FileText size={14} />, onSelect: () => setToDoc(memo) },
            {
              label: "삭제",
              icon: <Trash2 size={14} />,
              danger: true,
              onSelect: () => remove(memo),
            },
          ]}
        />
      </div>
    </li>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-title-md text-ink">메모</h2>
          {list.length > 0 && <span className="text-caption text-muted">{list.length}개</span>}
          <Button className="ml-auto" size="sm" onClick={add}>
            <Plus size={16} /> 메모
          </Button>
        </div>
        {list.length === 0 ? (
          <EmptyState
            boxed
            title="아직 메모가 없어요"
            actions={
              <Button variant="primary" onClick={add}>
                첫 메모 쓰기
              </Button>
            }
          >
            정리 전 아이디어를 적어 두는 곳이에요. 나중에 보드 포스트잇이나 사전 문서로 옮길 수
            있어요.
          </EmptyState>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <h3 className="mb-2 text-caption text-muted">고정됨</h3>
                <ul className="mb-6 flex flex-col gap-3">{pinned.map(card)}</ul>
                {rest.length > 0 && <h3 className="mb-2 text-caption text-muted">메모</h3>}
              </>
            )}
            <ul className="flex flex-col gap-3">{rest.map(card)}</ul>
          </>
        )}
      </div>
      {toDoc && <ToDocDialog onPick={pickCategory} onClose={() => setToDoc(null)} />}
      {notice && (
        <Toast
          action={notice.actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="text-button underline"
              onClick={() => {
                setNotice(null);
                a.run();
              }}
            >
              {a.label}
            </button>
          ))}
        >
          {notice.text}
        </Toast>
      )}
    </div>
  );
}
