import { useNavigate } from "react-router";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { setSynopsisBody, useNovelStore } from "../store/novelStore";
import { lineDotColor } from "./board/lines";
import { storyFlow } from "./overview/storyFlow";
import BodyEditor from "./wiki/BodyEditor";
import { placeText } from "./wiki/boardLinks";
import { useWikiNav } from "./wiki/useWikiNav";

// 개요 (F7): 작품 소개 · 시놉시스 본문 · 스토리 흐름(보드에서 자동 정리, 클릭 = 보드 블록)
export default function OverviewPage() {
  const novel = useNovelStore((s) => s.novel);
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const lines = useNovelStore((s) => s.lines);
  const scale = useNovelStore((s) => s.board?.timeScale);
  const { openBoard } = useWikiNav();
  const navigate = useNavigate();
  if (!novel || !scale) return null;
  const flow = storyFlow(items, docs, lines);
  const framed = flow.some((s) => s.frame);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-10 py-8">
        {(novel.genre || novel.synopsis) && (
          <div className="flex items-start gap-3">
            {novel.genre && (
              <span className="shrink-0 rounded-full bg-surface-card px-2 py-0.5 text-caption text-body">
                {novel.genre}
              </span>
            )}
            {novel.synopsis && (
              <p className="text-body-sm whitespace-pre-line text-muted">{novel.synopsis}</p>
            )}
          </div>
        )}

        <section aria-label="시놉시스" className="mt-6">
          <h2 className="mb-3 text-title-md text-ink">시놉시스</h2>
          <BodyEditor
            key={novel.id}
            label="시놉시스"
            initial={novel.synopsisBody ?? null}
            onChange={setSynopsisBody}
          />
        </section>

        <section aria-label="스토리 흐름" className="mt-12 border-t border-hairline pt-6">
          <h2 className="mb-3 flex items-center gap-2 text-title-md text-ink">
            스토리 흐름 <span className="text-caption text-muted">보드에서 자동 정리</span>
          </h2>
          {flow.length === 0 ? (
            <EmptyState
              boxed
              title="아직 사건이 없어요"
              actions={
                <Button onClick={() => navigate(`/novel/${novel.id}/board`)}>보드로 가기</Button>
              }
            >
              보드에 사건 블록을 놓으면 프레임 · 라인별로 시점순 정리돼요.
            </EmptyState>
          ) : (
            flow.map((section) => (
              <div key={section.frame?.id ?? "none"} className="mb-8">
                {framed && (
                  <h3 className="mb-2 text-title-sm text-ink">
                    {section.frame ? section.frame.title || "제목 없는 프레임" : "프레임 밖"}
                  </h3>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {section.lines.map(({ line, events }) => (
                    <div key={line?.id ?? "none"}>
                      <h4 className="mb-1 flex items-center gap-1.5 text-caption font-semibold text-muted">
                        {lineDotColor(line?.color) && (
                          <span
                            className="size-2 rounded-full"
                            style={{ background: lineDotColor(line?.color) }}
                          />
                        )}
                        {line?.name ?? "라인 미지정"} · {events.length}
                      </h4>
                      <ol>
                        {events.map((e) => (
                          <li key={e.id}>
                            <button
                              type="button"
                              data-testid="flow-row"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-body-sm text-ink hover:bg-surface-soft"
                              onClick={() => openBoard(e.id)}
                            >
                              <span className="w-20 shrink-0 truncate text-caption text-muted tabular-nums">
                                {placeText(e.place, scale)}
                              </span>
                              <span className="truncate">{docs[e.docId]?.title}</span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
