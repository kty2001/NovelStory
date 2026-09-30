import { useState } from "react";
import { Crosshair, FolderInput, MoreHorizontal, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import Menu from "../../components/Menu";
import type { WikiDoc } from "../../db/types";
import { renameDoc, setDocsLine, sortedLines } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { deleteDoc, moveDoc, setDocBody, updateDoc } from "../../store/wikiActions";
import { stateTicks } from "../board/stateCalc";
import Backlinks from "./Backlinks";
import BodyEditor from "./BodyEditor";
import BoardSection from "./BoardSection";
import { blockCount, categoryPath, familyOf, flatCategories, usedDocIds } from "./categories";
import ChipInput from "./ChipInput";
import DocImage from "./DocImage";
import PropsTable from "./PropsTable";
import TimePick, { StateAtTable } from "./TimePick";
import { useWikiNav } from "./useWikiNav";

// 분류 이동: 트리 순서 목록. 보드에 쓰인 문서는 다른 계열 분류 비활성 (data_model 5장)
function MoveDocDialog({ doc, onClose }: { doc: WikiDoc; onClose: () => void }) {
  const categories = useNovelStore((s) => s.categories);
  const used = usedDocIds(useNovelStore((s) => s.items)).has(doc.id);
  const family = familyOf(categories, doc.categoryId);
  return (
    <Dialog open onClose={onClose} title="분류 이동">
      {used && (
        <p className="mb-2 text-caption text-muted">
          보드에 쓰인 문서라 같은 계열 분류로만 옮길 수 있어요.
        </p>
      )}
      <ul className="max-h-80 overflow-y-auto">
        {flatCategories(categories).map(({ category: c, depth }) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={c.id === doc.categoryId || (used && familyOf(categories, c.id) !== family)}
              className="flex w-full items-center gap-2 rounded-sm py-2 pr-2 text-left text-body-sm text-ink hover:bg-surface-card disabled:text-muted-soft disabled:hover:bg-transparent"
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => {
                moveDoc(doc.id, c.id);
                onClose();
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--color-${c.color})` }}
              />
              {c.name}
              {c.id === doc.categoryId && <span className="text-caption">현재</span>}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

// 문서 삭제 확인 (W-6, UC-35): 함께 삭제될 블록 · 연결선 수, 깨진 링크가 될 역링크 수
function DeleteDocDialog({
  doc,
  onClose,
  onDeleted,
}: {
  doc: WikiDoc;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const items = useNovelStore((s) => s.items);
  const edges = useNovelStore((s) => s.edges);
  const docs = useNovelStore((s) => s.docs);
  const blockIds = new Set(
    Object.values(items).flatMap((i) => ("docId" in i && i.docId === doc.id ? [i.id] : [])),
  );
  const edgeCount = Object.values(edges).filter(
    (e) => blockIds.has(e.source) || blockIds.has(e.target),
  ).length;
  const backlinks = Object.values(docs).filter(
    (d) => d.id !== doc.id && d.mentions.includes(doc.id),
  ).length;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`'${doc.title}' 문서를 삭제할까요?`}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteDoc(doc.id);
              onDeleted();
            }}
          >
            {blockIds.size ? "문서와 블록 삭제" : "삭제"}
          </Button>
        </>
      }
    >
      {blockIds.size > 0 && (
        <div role="alert" className="mb-3 rounded-sm bg-surface-card px-3 py-2 text-body-sm">
          <b>보드 블록 {blockIds.size}개가 함께 삭제됩니다.</b>
          <p className="text-caption text-muted">
            {edgeCount > 0 && `그 블록에 이어진 연결선 ${edgeCount}개도 삭제돼요. `}
            보드에서 실행 취소로 되돌릴 수 없어요.
          </p>
        </div>
      )}
      {backlinks > 0 && (
        <p className="text-body-sm">
          이 문서를 언급한 문서 {backlinks}개의 링크는 깨진 링크로 남아요.
        </p>
      )}
      {doc.imageId && <p className="text-body-sm">대표 이미지도 함께 삭제돼요.</p>}
      {!blockIds.size && !backlinks && !doc.imageId && (
        <p className="text-body-sm">삭제한 문서는 되돌릴 수 없어요.</p>
      )}
    </Dialog>
  );
}

// 사전 문서 편집 (W-1 · W-2, UC-31): 제목 · 별칭 · 태그 · 라인(사건) · 속성 + 대표 이미지 · 본문
// · 보드 연동 · 역링크. 사전 화면과 보드의 사전 패널에서 공용 (onDeleted: 삭제 후 동작)
export default function DocView({ doc, onDeleted }: { doc: WikiDoc; onDeleted?: () => void }) {
  const categories = useNovelStore((s) => s.categories);
  const lines = useNovelStore((s) => s.lines);
  const items = useNovelStore((s) => s.items);
  const { openCategory, openBoard, inPanel } = useWikiNav();
  const [dialog, setDialog] = useState<"move" | "delete" | null>(null);
  // 시점 선택 보기 (F3, 캐릭터 계열): 블록이 옮겨져 없어진 눈금은 기본값으로
  const [time, setTime] = useState<number | null>(null);

  const path = categoryPath(categories, doc.categoryId);
  const category = path.at(-1);
  const blocks = blockCount(items, doc.id);
  const family = familyOf(categories, doc.categoryId);
  const ticks = family === "character" ? stateTicks(items, new Set([doc.id])) : [];
  const t = time !== null && ticks.includes(time) ? time : null;

  return (
    <article aria-label={`${doc.title} 문서`}>
      <div className="flex items-center gap-2 text-body-sm text-muted">
        <span
          className="size-2 rounded-full"
          style={{ background: `var(--color-${category?.color})` }}
        />
        {path.map((c) => c.name).join(" › ")}
        <span className="ml-auto" />
        {blocks > 0 && !inPanel && (
          <Button size="sm" onClick={() => openBoard(doc.id)}>
            <Crosshair size={14} />
            보드에서 보기 · {blocks}
          </Button>
        )}
        <Menu
          label="문서 메뉴"
          trigger={<MoreHorizontal size={18} />}
          items={[
            {
              label: "분류 이동",
              icon: <FolderInput size={14} />,
              onSelect: () => setDialog("move"),
            },
            {
              label: "삭제",
              icon: <Trash2 size={14} />,
              danger: true,
              onSelect: () => setDialog("delete"),
            },
          ]}
        />
      </div>

      <input
        key={doc.title}
        aria-label="제목"
        defaultValue={doc.title}
        className="mt-2 w-full rounded-sm text-display text-ink focus:bg-surface-soft focus:outline-none"
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Escape") e.currentTarget.value = doc.title;
          if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
        }}
        // 비우면 이전 제목 유지 (보드 블록 제목과 같은 규칙)
        onBlur={(e) => {
          const title = e.currentTarget.value.trim();
          if (title && title !== doc.title) renameDoc(doc.id, title);
          else e.currentTarget.value = doc.title;
        }}
      />

      <div className="mt-3 flex flex-col gap-2">
        <ChipInput
          label="별칭"
          values={doc.aliases}
          onChange={(aliases) => updateDoc(doc.id, { aliases })}
        />
        <ChipInput
          label="태그"
          values={doc.tags}
          onChange={(tags) => updateDoc(doc.id, { tags })}
        />
        {family === "event" && (
          <label className="flex items-center gap-1.5">
            <span className="w-12 shrink-0 text-caption text-muted">라인</span>
            <select
              aria-label="스토리 라인"
              value={doc.lineId ?? ""}
              className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-body-sm text-ink"
              onChange={(e) => setDocsLine([doc.id], e.target.value || undefined)}
            >
              <option value="">미지정</option>
              {sortedLines(lines).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <TimePick ticks={ticks} value={t} onChange={setTime} />
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-8">
        <div className="min-w-64 flex-1">
          {t !== null ? (
            <StateAtTable doc={doc} t={t} />
          ) : (
            <PropsTable props={doc.props} onChange={(props) => updateDoc(doc.id, { props })} />
          )}
        </div>
        <DocImage doc={doc} />
      </div>

      <div className="mt-8">
        <BodyEditor excludeId={doc.id} initial={doc.body} onChange={(b) => setDocBody(doc.id, b)} />
      </div>

      <BoardSection doc={doc} />
      <Backlinks docId={doc.id} title={doc.title} />

      {dialog === "move" && <MoveDocDialog doc={doc} onClose={() => setDialog(null)} />}
      {dialog === "delete" && (
        <DeleteDocDialog
          doc={doc}
          onClose={() => setDialog(null)}
          onDeleted={onDeleted ?? (() => openCategory(doc.categoryId))}
        />
      )}
    </article>
  );
}
