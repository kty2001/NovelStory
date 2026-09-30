import { createContext, useContext } from "react";
import { useNavigate, useParams } from "react-router";

// 보드의 사전 패널 안에서는 문서 열기를 패널 안 전환으로 대체 (UC-22)
export const OpenDocContext = createContext<((id: string) => void) | null>(null);

// 사전 화면 이동: 분류 화면(?category=) · 설정 점검(?view=check) · 문서 화면(wiki/:docId) · 보드 블록(board?focus=)
export function useWikiNav() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const openInPanel = useContext(OpenDocContext);
  return {
    inPanel: !!openInPanel,
    openCategory: (id: string) => navigate(`/novel/${novelId}/wiki?category=${id}`),
    openCheck: () => navigate(`/novel/${novelId}/wiki?view=check`),
    openDoc: openInPanel ?? ((id: string) => navigate(`/novel/${novelId}/wiki/${id}`)),
    // 문서 ID = 그 문서의 블록 전부, 블록 ID = 그 블록
    openBoard: (focus: string) => navigate(`/novel/${novelId}/board?focus=${focus}`),
  };
}
