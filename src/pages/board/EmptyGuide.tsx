import { useContext } from "react";
import { ShortcutHelpContext } from "../shortcutHelpContext";

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-xs border font-sans border-hairline bg-surface-card px-1.5 text-caption text-body">
    {children}
  </kbd>
);

const STEPS = [
  {
    title: "사건 올리기",
    key: "E",
    text: "도구 모음 “사건”을 시간축 위로 끌어 놓기. 놓은 자리 눈금에 맞춰짐",
  },
  {
    title: "캐릭터 기록",
    key: "C",
    text: "“캐릭터 상태”를 축 아래에 놓고 등장 · 변화 · 퇴장 기록",
  },
  {
    title: "설정 정리",
    key: "Alt 2",
    text: "사전 탭에서 캐릭터 · 장소 · 세계관 문서 작성. 블록과 문서는 자동 연결",
  },
];

// 빈 보드 안내 카드 (B-9, onboarding.md 3장): 보드 요소가 0개일 때만. 화면에 고정.
// 누를 요소가 없으므로 포인터 이벤트를 통과시켜 카드 아래 캔버스에도 바로 배치 · 팬 가능. 닫기 버튼 없음 (첫 요소를 놓으면 사라짐)
export function EmptyGuide() {
  const openHelp = useContext(ShortcutHelpContext);
  return (
    <section
      aria-label="보드 시작 안내"
      className="pointer-events-none absolute top-24 left-[calc(50%+40px)] z-10 w-[min(540px,calc(50%-56px))] rounded-lg border border-hairline bg-canvas px-5 pt-4 pb-2 break-keep shadow-float"
    >
      <h2 className="text-title-md text-ink">시간축에 첫 사건을 올려 보세요</h2>
      <p className="mb-3 text-caption text-muted">
        위쪽엔 사건, 아래쪽엔 캐릭터 변화. 모든 내용은 자동 저장됩니다.
      </p>
      <ol className="flex flex-col gap-2.5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-caption text-on-primary">
              {i + 1}
            </span>
            <div>
              <p className="text-title-sm text-ink">
                {s.title} <Kbd>{s.key}</Kbd>
              </p>
              <p className="text-caption text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center border-t border-hairline py-2 text-caption text-muted">
        <p>시점을 모르면 왼쪽 “시점 미정”에 놓으세요</p>
        <button
          type="button"
          className="pointer-events-auto ml-auto flex items-center gap-1.5 text-button text-body hover:text-ink"
          onClick={openHelp}
        >
          단축키 보기 <Kbd>?</Kbd>
        </button>
      </div>
    </section>
  );
}

// 요소는 있으나 필터로 모두 숨겨졌을 때 (B-9 메모 5): 안내 카드 대신 알림 + 필터 해제
export function AllHiddenNotice({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div
      role="status"
      className="absolute bottom-6 left-6 z-10 flex items-center gap-4 rounded-md bg-primary px-4 py-2 text-body-sm text-on-primary shadow-float"
    >
      <span>필터로 {count}개 숨김</span>
      <button type="button" className="text-button underline" onClick={onClear}>
        필터 해제
      </button>
    </div>
  );
}
