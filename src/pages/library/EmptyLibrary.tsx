import { BookOpen, Import, Plus } from "lucide-react";
import Button from "../../components/Button";
import { SAMPLE } from "./sample";

type Props = {
  onCreate: () => void;
  onImport: () => void;
  onSample: () => void;
  sampleLoading: boolean;
};

// L-2 빈 서재: 새 소설 · JSON 가져오기 · 샘플 소설로 둘러보기
export default function EmptyLibrary({ onCreate, onImport, onSample, sampleLoading }: Props) {
  return (
    <section className="flex flex-col items-center py-16 text-center">
      <BookOpen size={56} strokeWidth={1.25} className="text-muted-soft" aria-hidden />
      <h2 className="mt-6 text-title-lg text-ink">아직 소설이 없어요</h2>
      <p className="mt-2 text-body-md text-muted">
        첫 소설을 만들고 시간축 위에 사건을 올려 보세요.
        <br />
        모든 내용은 이 브라우저에 자동 저장됩니다.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={onCreate}>
          <Plus size={16} /> 새 소설
        </Button>
        <Button onClick={onImport}>
          <Import size={16} /> JSON 가져오기
        </Button>
      </div>

      <button
        type="button"
        disabled={sampleLoading}
        className="mt-12 flex w-full max-w-md items-center gap-4 rounded-lg bg-surface-card p-4 text-left disabled:opacity-60"
        onClick={onSample}
      >
        <span className="flex aspect-[3/4] w-16 shrink-0 items-center justify-center rounded-sm bg-surface-strong p-2 text-center font-serif text-body-sm text-ink">
          잿빛 왕관
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-title-sm text-ink">샘플 소설로 둘러보기</span>
          <span className="block text-caption text-muted">
            {SAMPLE.title} · {SAMPLE.genre} · 사건 {SAMPLE.events} · 사전 문서 {SAMPLE.docs}
          </span>
        </span>
        <span className="text-button text-ink">{sampleLoading ? "불러오는 중…" : "열기 →"}</span>
      </button>
    </section>
  );
}
