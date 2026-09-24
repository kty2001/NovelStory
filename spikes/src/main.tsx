import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import "./index.css";
import C1 from "./c1/C1";
import C2 from "./c2/C2";
import C3 from "./c3/C3";
import C4 from "./c4/C4";
import C5 from "./c5/C5";
import C6 from "./c6/C6";
import C7 from "./c7/C7";
import C8 from "./c8/C8";

const pages = [
  ["c1", "C1 한글 IME — 위키 에디터", C1],
  ["c2", "C2 보드 단축키 × IME", C2],
  ["c3", "C3 React Flow 성능", C3],
  ["c4", "C4 시간축", C4],
  ["c5", "C5 터치", C5],
  ["c6", "C6 인라인 편집", C6],
  ["c7", "C7 프레임", C7],
  ["c8", "C8 IndexedDB 용량", C8],
] as const;

function Home() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-2xl font-bold">WhiteNoard 기술 스파이크</h1>
      <ul className="space-y-2">
        {pages.map(([path, title]) => (
          <li key={path}>
            <Link className="underline" to={`/${path}`}>
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {pages.map(([path, , Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
