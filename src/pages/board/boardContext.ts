import { createContext, useContext } from "react";

// 보드 화면 상태 중 노드 컴포넌트가 쓰는 것: 인라인 편집 중인 요소
export type BoardUi = { editId: string | null; setEditId: (id: string | null) => void };

export const BoardUiContext = createContext<BoardUi>({ editId: null, setEditId: () => {} });
export const useBoardUi = () => useContext(BoardUiContext);
