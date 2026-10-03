import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { Download, Info, Keyboard, MoreHorizontal, Search } from "lucide-react";
import Menu from "../components/Menu";
import Toast from "../components/Toast";
import { exportNovel } from "../db/novelExport";
import { updateNovelInfo } from "../db/novels";
import { patchUiState } from "../db/uiState";
import {
  adoptExport,
  adoptNovel,
  currentRecords,
  flushSave,
  loadNovel,
  unloadNovel,
  useNovelStore,
} from "../store/novelStore";
import BackupBanner from "./BackupBanner";
import NovelFormDialog, { type NovelFormSubmit } from "./library/NovelFormDialog";
import { isEditable } from "./board/tools";
import QuickMove from "./QuickMove";
import SaveStatus from "./SaveStatus";
import ShortcutHelp from "./ShortcutHelp";
import { ShortcutHelpContext } from "./shortcutHelpContext";

const TAB_KEYS = {
  Digit1: "board",
  Digit2: "wiki",
  Digit3: "overview",
  Digit4: "narrative",
  Digit5: "memo",
} as const;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-button ${isActive ? "bg-surface-card text-ink" : "text-muted"}`;

// 작업공간: 소설 로드 + 상단 바 (← 서재 · 제목 · 보드/사전 탭 · 저장 상태 · ⋯ 메뉴)
export default function NovelLayout() {
  const { novelId } = useParams();
  const { pathname } = useLocation();
  const status = useNovelStore((s) => s.status);
  const novel = useNovelStore((s) => s.novel);
  const [infoOpen, setInfoOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const navigate = useNavigate();

  // 공통 단축키 (shortcuts 1장): Ctrl+K 빠른 이동(B-8) · Ctrl+S 자동 저장 안내 · Alt+1~5 탭 · ? 도움말
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === "KeyK") {
        e.preventDefault();
        setQuickOpen(true);
      } else if (mod && e.code === "KeyS") {
        e.preventDefault(); // 브라우저 저장 대화상자 대신 (편집 중에도)
        setSavedNotice(true);
      } else if (e.altKey && !mod && e.code in TAB_KEYS) {
        e.preventDefault();
        void navigate(TAB_KEYS[e.code as keyof typeof TAB_KEYS]);
      } else if (e.shiftKey && !mod && !e.altKey && e.code === "Slash" && !isEditable(e.target)) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = setTimeout(() => setSavedNotice(false), 2000);
    return () => clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    if (!novelId) return;
    void loadNovel(novelId);
    return () => void unloadNovel();
  }, [novelId]);

  // 마지막으로 보던 탭 (UC-02: 서재에서 다시 열 때 복귀)
  const tab = pathname.includes("/wiki")
    ? "wiki"
    : pathname.includes("/overview")
      ? "overview"
      : pathname.includes("/narrative")
        ? "narrative"
        : pathname.includes("/memo")
          ? "memo"
          : "board";
  useEffect(() => {
    if (novelId && status === "ready") void patchUiState(novelId, { lastTab: tab });
  }, [novelId, status, tab]);

  // DB에 직접 쓰는 동작: 미저장분을 먼저 저장하고, 결과 소설 레코드를 스토어에 반영.
  // 내보내기는 저장 실패 중에도 화면 그대로 (스토어 레코드, UC-42)
  const exportCurrent = async () => {
    if (!novelId) return;
    await flushSave();
    adoptExport(await exportNovel(novelId, currentRecords()));
  };
  const submitInfo: NovelFormSubmit = async (info, cover) => {
    if (!novelId) return;
    await flushSave();
    adoptNovel(await updateNovelInfo(novelId, info, cover));
  };

  if (status === "missing") {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-title-lg">소설을 찾을 수 없음</h1>
        <Link className="text-body-sm text-muted underline" to="/">
          서재로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-hairline px-4 py-2">
        <Link className="text-body-sm text-muted" to="/">
          ← 서재
        </Link>
        <h1 className="text-title-sm">{novel?.title}</h1>
        <nav className="flex gap-1">
          <NavLink className={tabClass} to="board">
            보드
          </NavLink>
          <NavLink className={tabClass} to="wiki">
            사전
          </NavLink>
          <NavLink className={tabClass} to="overview">
            개요
          </NavLink>
          <NavLink className={tabClass} to="narrative">
            서술
          </NavLink>
          <NavLink className={tabClass} to="memo">
            메모
          </NavLink>
        </nav>
        {status === "ready" && (
          <>
            <SaveStatus onExport={exportCurrent} />
            <button
              type="button"
              aria-label="빠른 이동"
              className="flex w-64 items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-caption text-muted hover:border-muted-soft"
              onClick={() => setQuickOpen(true)}
            >
              <Search size={14} />
              빠른 이동 — 문서 · 시점
              <kbd className="ml-auto rounded-xs bg-surface-card px-1.5 font-sans">Ctrl K</kbd>
            </button>
            <button
              type="button"
              aria-label="단축키 도움말"
              title="단축키 도움말 (?)"
              className="flex size-8 items-center justify-center rounded-full border border-hairline text-caption text-muted hover:border-muted-soft"
              onClick={() => setHelpOpen(true)}
            >
              ?
            </button>
            <Menu
              label="소설 메뉴"
              trigger={<MoreHorizontal size={18} />}
              items={[
                {
                  label: "내보내기",
                  icon: <Download size={14} />,
                  onSelect: () => void exportCurrent(),
                },
                {
                  label: "단축키 도움말",
                  icon: <Keyboard size={14} />,
                  onSelect: () => setHelpOpen(true),
                },
                { label: "소설 정보", icon: <Info size={14} />, onSelect: () => setInfoOpen(true) },
              ]}
            />
          </>
        )}
      </header>
      {status === "ready" && novelId && <BackupBanner novelId={novelId} onExport={exportCurrent} />}
      <div className="min-h-0 flex-1">
        {status === "ready" && (
          <ShortcutHelpContext.Provider value={() => setHelpOpen(true)}>
            <Outlet />
          </ShortcutHelpContext.Provider>
        )}
      </div>
      {status === "ready" && <QuickMove open={quickOpen} onClose={() => setQuickOpen(false)} />}
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      {savedNotice && <Toast>자동 저장됨 — 따로 저장하지 않아도 돼요</Toast>}
      <NovelFormDialog
        open={infoOpen}
        novel={novel ?? undefined}
        onClose={() => setInfoOpen(false)}
        onSubmit={submitInfo}
      />
    </div>
  );
}
