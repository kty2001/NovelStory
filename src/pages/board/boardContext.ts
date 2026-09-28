import { createContext, useContext } from "react";

// 보드 화면 상태 중 노드 컴포넌트가 쓰는 것: 인라인 편집 중인 요소, 크기 조절 끝 (노드 좌표 기준)
export type BoardUi = {
  editId: string | null;
  setEditId: (id: string | null) => void;
  resized: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
};

export const BoardUiContext = createContext<BoardUi>({
  editId: null,
  setEditId: () => {},
  resized: () => {},
});
export const useBoardUi = () => useContext(BoardUiContext);
