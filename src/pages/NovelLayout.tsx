import { useEffect } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router";
import { loadNovel, unloadNovel, useNovelStore } from "../store/novelStore";
import BackupBanner from "./BackupBanner";

const SAVE_LABEL = { saving: "저장 중", saved: "저장됨", error: "저장 실패" } as const;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-button ${isActive ? "bg-surface-card text-ink" : "text-muted"}`;

// 작업공간: 소설 로드 + 상단 바 (← 서재 · 제목 · 보드/사전 탭 · 저장 상태)
export default function NovelLayout() {
  const { novelId } = useParams();
  const status = useNovelStore((s) => s.status);
  const title = useNovelStore((s) => s.novel?.title);
  const save = useNovelStore((s) => s.save);

  useEffect(() => {
    if (!novelId) return;
    void loadNovel(novelId);
    return () => void unloadNovel();
  }, [novelId]);

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
        <h1 className="text-title-sm">{title}</h1>
        <nav className="flex gap-1">
          <NavLink className={tabClass} to="board">
            보드
          </NavLink>
          <NavLink className={tabClass} to="wiki">
            사전
          </NavLink>
        </nav>
        {status === "ready" && (
          <span
            className={`ml-auto text-caption ${save === "error" ? "text-error" : "text-muted"}`}
          >
            {SAVE_LABEL[save]}
          </span>
        )}
      </header>
      {status === "ready" && novelId && <BackupBanner novelId={novelId} />}
      <div className="min-h-0 flex-1">{status === "ready" && <Outlet />}</div>
    </div>
  );
}
