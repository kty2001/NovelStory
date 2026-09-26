import { createBrowserRouter, Navigate } from "react-router";
import LibraryPage from "./pages/library/LibraryPage";
import NovelLayout from "./pages/NovelLayout";
import BoardPage from "./pages/BoardPage";
import WikiPage from "./pages/WikiPage";

export const router = createBrowserRouter([
  { path: "/", element: <LibraryPage /> },
  {
    path: "/novel/:novelId",
    element: <NovelLayout />,
    children: [
      // 마지막 탭 복원은 F0 (UC-02)
      { index: true, element: <Navigate to="board" replace /> },
      { path: "board", element: <BoardPage /> },
      { path: "wiki/:docId?", element: <WikiPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
