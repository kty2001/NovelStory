import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { ReactFlowProvider, type Viewport } from "@xyflow/react";
import { db } from "../db/db";
import Board from "./board/Board";

// 보드: 마지막으로 보던 화면 위치(UiState.viewport)를 불러온 뒤 캔버스 표시.
// 처음 열면 0 눈금이 화면 가로 중앙, 시간축이 세로 중앙 (onboarding.md)
export default function BoardPage() {
  const { novelId } = useParams();
  const [ui, setUi] = useState<{ novelId: string; viewport: Viewport } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!novelId) return;
    let alive = true;
    void db.uiState.get(novelId).then((saved) => {
      if (!alive) return;
      const el = wrapper.current;
      const center = { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2, zoom: 1 };
      setUi({ novelId, viewport: saved?.viewport ?? center });
    });
    return () => {
      alive = false;
    };
  }, [novelId]);

  return (
    <div ref={wrapper} className="h-full" data-testid="board">
      {/* 다른 소설의 화면 위치로 초기화되지 않도록 소설 ID 일치 확인 */}
      {novelId && ui?.novelId === novelId && (
        <ReactFlowProvider key={novelId}>
          <Board novelId={novelId} viewport={ui.viewport} />
        </ReactFlowProvider>
      )}
    </div>
  );
}
