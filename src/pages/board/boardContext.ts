import { createContext, useContext } from "react";
import type { Tool } from "./tools";

// 보드 화면 상태 중 노드 컴포넌트가 쓰는 것: 인라인 편집 중인 요소, 크기 조절 끝 (노드 좌표 기준)
export type BoardUi = {
  editId: string | null;
  setEditId: (id: string | null) => void;
  resized: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
  tool: Tool;
};

export const BoardUiContext = createContext<BoardUi>({
  editId: null,
  setEditId: () => {},
  resized: () => {},
  tool: "select",
});
export const useBoardUi = () => useContext(BoardUiContext);
