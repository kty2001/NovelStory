import { X } from "lucide-react";

// 별칭 · 태그 칩 목록: Enter · 바깥 클릭으로 추가(한글 조합 중 Enter 무시, 공백 · 중복 무시), × 삭제
export default function ChipInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const add = (input: HTMLInputElement) => {
    const v = input.value.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    input.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-12 shrink-0 text-caption text-muted">{label}</span>
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 rounded-full bg-surface-card py-0.5 pr-1.5 pl-2.5 text-body-sm text-ink"
        >
          {v}
          <button
            type="button"
            aria-label={`${label} ${v} 삭제`}
            className="text-muted hover:text-ink"
            onClick={() => onChange(values.filter((x) => x !== v))}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        aria-label={`${label} 추가`}
        placeholder={`+ ${label}`}
        className="w-28 rounded-full px-2.5 py-0.5 text-body-sm text-ink placeholder:text-muted focus:bg-surface-soft focus:outline-none"
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter") add(e.currentTarget);
          if (e.key === "Escape") e.currentTarget.value = "";
        }}
        onBlur={(e) => add(e.currentTarget)}
      />
    </div>
  );
}
