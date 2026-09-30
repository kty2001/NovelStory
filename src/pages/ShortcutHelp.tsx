import Dialog from "../components/Dialog";

// shortcuts.md 1 · 2.1~2.5 · 3장 표
const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: "공통",
    rows: [
      ["Ctrl K", "빠른 이동 (문서 · 시점)"],
      ["?", "단축키 도움말"],
      ["Ctrl S", "자동 저장 안내"],
      ["Esc", "한 단계 닫기"],
      ["Alt 1 / 2 / 3", "보드 / 사전 / 개요 탭"],
    ],
  },
  {
    title: "보드 도구",
    rows: [
      ["V", "선택"],
      ["H", "손 (화면 이동)"],
      ["E", "사건 블록"],
      ["C", "캐릭터 상태 (다시 누르면 등장 → 변화 → 퇴장)"],
      ["S", "포스트잇"],
      ["T", "텍스트"],
      ["F", "프레임"],
      ["L", "연결선"],
    ],
  },
  {
    title: "보드 선택 · 편집",
    rows: [
      ["Shift / Ctrl + 클릭", "선택 추가 · 해제"],
      ["Ctrl A", "전체 선택"],
      ["Tab / Shift Tab", "다음 / 이전 요소"],
      ["Enter", "열기 (블록 = 사전 패널, 그 외 = 편집)"],
      ["F2 · 더블클릭", "제목 · 내용 편집"],
      ["Delete", "삭제"],
      ["Ctrl C / X / V", "복사 / 잘라내기 / 붙여넣기"],
      ["Ctrl D", "복제"],
      ["Ctrl Z", "실행 취소"],
      ["Ctrl Shift Z · Ctrl Y", "다시 실행"],
      ["Ctrl G / Ctrl Shift G", "프레임으로 묶기 / 풀기"],
    ],
  },
  {
    title: "보드 이동 · 화면",
    rows: [
      ["← →", "시간 블록 1 눈금 · 그 외 8px"],
      ["↑ ↓", "8px"],
      ["Shift + 방향키", "5 눈금 · 40px"],
      ["Alt + 끌기", "눈금 스냅 일시 해제"],
      ["Space + 끌기 · 가운데 버튼", "화면 이동"],
      ["+ / −", "확대 / 축소"],
      ["Shift 0", "100%"],
      ["Shift 1", "화면 맞춤"],
      ["Shift 2", "선택 요소에 맞춤"],
      ["% 클릭", "배율 직접 입력 · 프리셋"],
    ],
  },
  {
    title: "시간축",
    rows: [
      ["눈금 클릭", "라벨 편집"],
      ["Shift + 눈금 클릭", "구간 선택 → 끝 눈금 클릭 → 접기"],
      ["눈금 우클릭", "눈금 삽입 · 라벨 · 구간 선택"],
      ["≈ 칩 클릭", "접힌 구간 펼치기"],
    ],
  },
  {
    title: "사전",
    rows: [
      ["Ctrl B / Ctrl I", "굵게 / 기울임"],
      ["Ctrl Alt 1~3 · # ## ###", "제목 H1~H3"],
      ["Ctrl Shift 8 · -", "글머리 목록"],
      ["Ctrl Shift 7 · 1.", "번호 목록"],
      ["Ctrl Shift B · >", "인용"],
      ["@ + 글자", "문서 링크 후보 (↑↓ 이동 · Enter 삽입)"],
      ["Enter · Tab · Esc", "표 칸 확정 · 다음 칸 · 취소"],
    ],
  },
];

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="단축키"
      className="max-h-[calc(100vh-64px)] w-[min(760px,calc(100vw-32px))]"
    >
      <div className="columns-2 gap-8 max-md:columns-1">
        {SECTIONS.map((s) => (
          <section key={s.title} className="mb-5 break-inside-avoid">
            <h3 className="mb-2 text-title-sm text-ink">{s.title}</h3>
            <table className="w-full text-caption">
              <tbody>
                {s.rows.map(([key, action]) => (
                  <tr key={key} className="border-t border-hairline">
                    <td className="py-1 pr-3 whitespace-nowrap">
                      <kbd className="rounded-xs bg-surface-card px-1.5 font-sans text-body">
                        {key}
                      </kbd>
                    </td>
                    <td className="py-1 text-muted">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
