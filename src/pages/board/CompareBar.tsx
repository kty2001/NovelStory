import { Panel } from "@xyflow/react";
import { Link } from "react-router";
import { X } from "lucide-react";
import { useNovelStore } from "../../store/novelStore";
import { episodeName, sortedEpisodes } from "../narrative/narrative";
import type { CompareScope } from "../narrative/readingPath";

const Swatch = ({ className }: { className: string }) => (
  <span aria-hidden className={`inline-block h-0.5 w-4 ${className}`} />
);

// 서술 비교 바 (F2 2차): 범위(전체 · 회차 하나) · 범례 · 역행 수 · 보드에 없는 배치 수
export default function CompareBar({
  scope,
  reverse,
  unplaced,
  onScope,
  onClose,
}: {
  scope: CompareScope;
  reverse: number;
  unplaced: number;
  onScope: (scope: CompareScope) => void;
  onClose: () => void;
}) {
  const novelId = useNovelStore((s) => s.novelId);
  const episodes = sortedEpisodes(useNovelStore((s) => s.episodes));

  return (
    <Panel
      position="top-left"
      aria-label="서술 비교"
      className="flex max-w-80 flex-col gap-2 rounded-lg border border-hairline bg-canvas p-3 text-caption text-body shadow-float"
    >
      <div className="flex items-center gap-2">
        <span className="text-title-sm text-ink">서술 비교</span>
        <button
          type="button"
          aria-label="서술 비교 닫기"
          className="ml-auto rounded-sm p-1 text-muted hover:bg-surface-card"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
      {episodes.length === 0 ? (
        <p>
          회차가 없어요.{" "}
          <Link className="text-ink underline" to={`/novel/${novelId}/narrative`}>
            서술 탭에서 회차 만들기
          </Link>
        </p>
      ) : (
        <>
          <select
            aria-label="비교 범위"
            value={scope}
            className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-body-sm text-ink"
            onChange={(e) => onScope(e.target.value)}
          >
            <option value="all">전체 회차</option>
            {episodes.map((e) => (
              <option key={e.id} value={e.id}>
                {episodeName(e)}
              </option>
            ))}
          </select>
          <ul className="flex flex-col gap-1">
            <li className="flex items-center gap-2">
              <Swatch className="bg-brand-teal" /> 읽는 순서
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="border-t-2 border-dashed border-brand-lavender" /> 의도된 역행
              (회상 · 예고 복귀)
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="h-1 bg-brand-coral" />
              <span data-testid="reverse-count">
                역행 {reverse}곳{reverse > 0 && " — 서술 방식 표시가 빠졌는지 확인"}
              </span>
            </li>
          </ul>
          {unplaced > 0 && <p className="text-muted">보드에 없는 사건 배치 {unplaced}개는 제외</p>}
        </>
      )}
    </Panel>
  );
}
