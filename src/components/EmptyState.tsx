import type { ReactNode } from "react";

// 빈 상태 공통 형태 (onboarding 2장): 제목 1줄 + 보조 문구 1~2줄 + 버튼 최대 2개.
// boxed = 테두리 상자 (분류 · 검색 결과 자리), 아니면 목록 안 짧은 안내
export default function EmptyState({
  title,
  children,
  actions,
  boxed = false,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  boxed?: boolean;
}) {
  return (
    <div
      data-testid="empty-state"
      className={`break-keep ${boxed ? "mt-6 rounded-md border border-hairline px-6 pt-10 pb-8 text-center" : "py-3"}`}
    >
      <p className={boxed ? "text-title-md text-ink" : "text-body-sm text-ink"}>{title}</p>
      {children && <p className="mt-1.5 text-body-sm text-muted">{children}</p>}
      {actions && (
        <div className={`mt-5 flex gap-2 ${boxed ? "justify-center" : ""}`}>{actions}</div>
      )}
    </div>
  );
}
