import { useNavigate, useParams } from "react-router";

// 사전 화면 이동: 분류 화면(?category=) · 문서 화면(wiki/:docId)
export function useWikiNav() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  return {
    openCategory: (id: string) => navigate(`/novel/${novelId}/wiki?category=${id}`),
    openDoc: (id: string) => navigate(`/novel/${novelId}/wiki/${id}`),
  };
}
