import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router";
import { Download, Info, MoreHorizontal } from "lucide-react";
import Menu from "../components/Menu";
import { exportNovel } from "../db/novelExport";
import { updateNovelInfo } from "../db/novels";
import { patchUiState } from "../db/uiState";
import { adoptNovel, flushSave, loadNovel, unloadNovel, useNovelStore } from "../store/novelStore";
import BackupBanner from "./BackupBanner";
import NovelFormDialog, { type NovelFormSubmit } from "./library/NovelFormDialog";

const SAVE_LABEL = { saving: "저장 중", saved: "저장됨", error: "저장 실패" } as const;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-button ${isActive ? "bg-surface-card text-ink" : "text-muted"}`;

// 작업공간: 소설 로드 + 상단 바 (← 서재 · 제목 · 보드/사전 탭 · 저장 상태 · ⋯ 메뉴)
export default function NovelLayout() {
  const { novelId } = useParams();
  const { pathname } = useLocation();
  const status = useNovelStore((s) => s.status);
  const novel = useNovelStore((s) => s.novel);
  const save = useNovelStore((s) => s.save);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!novelId) return;
    void loadNovel(novelId);
    return () => void unloadNovel();
  }, [novelId]);

  // 마지막으로 보던 탭 (UC-02: 서재에서 다시 열 때 복귀)
  const tab = pathname.includes("/wiki") ? "wiki" : "board";
  useEffect(() => {
    if (novelId && status === "ready") void patchUiState(novelId, { lastTab: tab });
  }, [novelId, status, tab]);

  // DB에 직접 쓰는 동작: 미저장분을 먼저 저장하고, 결과 소설 레코드를 스토어에 반영
  const exportCurrent = async () => {
    if (!novelId) return;
    await flushSave();
    adoptNovel(await exportNovel(novelId));
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
        </nav>
        {status === "ready" && (
          <>
            <span
              className={`ml-auto text-caption ${save === "error" ? "text-error" : "text-muted"}`}
            >
              {SAVE_LABEL[save]}
            </span>
            <Menu
              label="소설 메뉴"
              trigger={<MoreHorizontal size={18} />}
              items={[
                {
                  label: "내보내기",
                  icon: <Download size={14} />,
                  onSelect: () => void exportCurrent(),
                },
                { label: "소설 정보", icon: <Info size={14} />, onSelect: () => setInfoOpen(true) },
              ]}
            />
          </>
        )}
      </header>
      {status === "ready" && novelId && <BackupBanner novelId={novelId} onExport={exportCurrent} />}
      <div className="min-h-0 flex-1">{status === "ready" && <Outlet />}</div>
      <NovelFormDialog
        open={infoOpen}
        novel={novel ?? undefined}
        onClose={() => setInfoOpen(false)}
        onSubmit={submitInfo}
      />
    </div>
  );
}
