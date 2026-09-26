import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Import, Plus, X } from "lucide-react";
import Button from "../../components/Button";
import Toast from "../../components/Toast";
import { db } from "../../db/db";
import { exportNovel, importFile } from "../../db/novelExport";
import {
  createNovel,
  deleteNovel,
  duplicateNovel,
  purgeDeletedNovels,
  purgeNovel,
  restoreNovel,
  UNDO_MS,
  updateNovelInfo,
} from "../../db/novels";
import { requestPersistOnce } from "../../db/persist";
import type { Novel } from "../../db/types";
import DeleteDialog from "./DeleteDialog";
import EmptyLibrary from "./EmptyLibrary";
import ImportErrorDialog from "./ImportErrorDialog";
import NovelCard from "./NovelCard";
import NovelFormDialog, { type NovelFormSubmit } from "./NovelFormDialog";
import { importSample } from "./sample";

type Sort = "updated" | "title";

const tabClass = (active: boolean) =>
  `rounded-full px-4 py-2 text-button ${active ? "bg-surface-card text-ink" : "text-muted"}`;

// L-1 서재 (소설 0개면 L-2 빈 상태)
export default function LibraryPage() {
  const navigate = useNavigate();
  const novels = useLiveQuery(() => db.novels.filter((n) => !n.deletedAt).toArray(), []);
  const sortMeta = useLiveQuery(() => db.meta.get("librarySort"), []);
  const sort: Sort = sortMeta?.key === "librarySort" ? sortMeta.value : "updated";

  const [form, setForm] = useState<{ novel?: Novel } | null>(null);
  const [deleting, setDeleting] = useState<Novel | null>(null);
  const [deleted, setDeleted] = useState<Novel | null>(null);
  const [importError, setImportError] = useState<unknown>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [storageBroken, setStorageBroken] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.open()
      .then(() => purgeDeletedNovels())
      .catch(() => setStorageBroken(true));
  }, []);

  // 되돌리기 알림이 끝나면 물리 삭제
  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => {
      setDeleted(null);
      void purgeNovel(deleted.id);
    }, UNDO_MS);
    return () => clearTimeout(timer);
  }, [deleted]);

  const open = async (novel: Novel) => {
    const ui = await db.uiState.get(novel.id);
    navigate(`/novel/${novel.id}/${ui?.lastTab ?? "board"}`);
  };

  const submitForm: NovelFormSubmit = async (info, cover) => {
    if (form?.novel) {
      await updateNovelInfo(form.novel.id, info, cover);
      return;
    }
    const id = await createNovel(info, cover ?? undefined);
    void requestPersistOnce();
    navigate(`/novel/${id}/board`);
  };

  const importPicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importFile(file);
      void requestPersistOnce();
    } catch (err) {
      setImportError(err);
    }
  };

  const openSample = async () => {
    setSampleLoading(true);
    try {
      const id = await importSample();
      void requestPersistOnce();
      navigate(`/novel/${id}/board`);
    } catch (err) {
      setImportError(err);
      setSampleLoading(false);
    }
  };

  const confirmDelete = async (novel: Novel) => {
    setDeleting(null);
    await deleteNovel(novel.id);
    setDeleted(novel);
  };

  const undoDelete = async () => {
    if (!deleted) return;
    setDeleted(null);
    await restoreNovel(deleted.id);
  };

  const sorted = [...(novels ?? [])].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title, "ko")
      : b.updatedAt.localeCompare(a.updatedAt),
  );
  const pickFile = () => fileInput.current?.click();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <header className="flex items-center gap-2">
        <span className="mr-auto text-title-lg text-ink">WhiteNoard</span>
        <Button size="sm" onClick={pickFile}>
          <Import size={16} /> 가져오기
        </Button>
        <Button size="sm" variant="primary" onClick={() => setForm({})}>
          <Plus size={16} /> 새 소설
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="JSON 파일 가져오기"
          className="hidden"
          onChange={(e) => {
            void importPicked(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </header>

      {storageBroken && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-md bg-surface-card p-4 text-body-sm"
        >
          <div className="flex-1">
            <b className="text-warning">⚠ 이 브라우저에서는 저장할 수 없습니다</b>
            <p className="text-muted">
              시크릿 모드 등에서는 창을 닫으면 사라집니다. 작업 후 내보내기로 보관하세요.
            </p>
          </div>
          <button type="button" aria-label="닫기" onClick={() => setStorageBroken(false)}>
            <X size={16} />
          </button>
        </div>
      )}

      {novels && novels.length === 0 && (
        <EmptyLibrary
          onCreate={() => setForm({})}
          onImport={pickFile}
          onSample={() => void openSample()}
          sampleLoading={sampleLoading}
        />
      )}

      {novels && novels.length > 0 && (
        <>
          <div className="mt-8 flex items-center gap-4">
            <h1 className="text-title-md text-ink">
              서재{" "}
              <span className="text-body-sm text-muted tabular-nums">소설 {novels.length}</span>
            </h1>
            <div role="tablist" className="flex gap-1">
              {(
                [
                  ["updated", "최근 수정순"],
                  ["title", "제목순"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={sort === value}
                  className={tabClass(sort === value)}
                  onClick={() => void db.meta.put({ key: "librarySort", value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {sorted.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onOpen={() => void open(novel)}
                onEdit={() => setForm({ novel })}
                onDuplicate={() => void duplicateNovel(novel.id)}
                onExport={() => void exportNovel(novel.id)}
                onDelete={() => setDeleting(novel)}
              />
            ))}
          </div>
        </>
      )}

      <NovelFormDialog
        open={!!form}
        novel={form?.novel}
        onClose={() => setForm(null)}
        onSubmit={submitForm}
      />
      <DeleteDialog
        novel={deleting}
        onClose={() => setDeleting(null)}
        onExport={(novel) => void exportNovel(novel.id)}
        onConfirm={(novel) => void confirmDelete(novel)}
      />
      <ImportErrorDialog error={importError} onClose={() => setImportError(null)} />
      {deleted && (
        <Toast
          action={
            <button
              type="button"
              className="text-button underline"
              onClick={() => void undoDelete()}
            >
              되돌리기
            </button>
          }
        >
          '{deleted.title}' 삭제됨
        </Toast>
      )}
    </div>
  );
}
