import { createBrowserRouter, Navigate } from "react-router";
import LibraryPage from "./pages/library/LibraryPage";
import NovelLayout from "./pages/NovelLayout";

// 보드(React Flow) · 사전(Tiptap)은 따로 불러와 서재 첫 로드를 가볍게.
// 탭 이동 중엔 불러오는 동안 이전 화면 유지
export const router = createBrowserRouter([
  { path: "/", element: <LibraryPage /> },
  {
    path: "/novel/:novelId",
    element: <NovelLayout />,
    hydrateFallbackElement: null,
    children: [
      // 마지막 탭 복원은 F0 (UC-02)
      { index: true, element: <Navigate to="board" replace /> },
      {
        path: "board",
        lazy: async () => ({ Component: (await import("./pages/BoardPage")).default }),
      },
      {
        path: "wiki/:docId?",
        lazy: async () => ({ Component: (await import("./pages/WikiPage")).default }),
      },
      {
        path: "overview",
        lazy: async () => ({ Component: (await import("./pages/OverviewPage")).default }),
      },
      {
        path: "narrative",
        lazy: async () => ({ Component: (await import("./pages/NarrativePage")).default }),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
