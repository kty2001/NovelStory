import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus, X } from "lucide-react";
import BlobImage from "../../components/BlobImage";
import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import { db } from "../../db/db";
import { resizeImage } from "../../db/images";
import type { NovelInfo, ResizedImage } from "../../db/novels";
import type { Novel } from "../../db/types";

// cover: undefined = 그대로, null = 제거, 값 = 새 표지
export type NovelFormSubmit = (
  info: NovelInfo,
  cover: ResizedImage | null | undefined,
) => Promise<void>;

type Props = { open: boolean; novel?: Novel; onClose: () => void; onSubmit: NovelFormSubmit };

// L-3 새 소설 / 소설 정보 (생성·수정 공용)
export default function NovelFormDialog({ open, novel, onClose, onSubmit }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={novel ? "소설 정보" : "새 소설"}>
      <NovelForm novel={novel} onClose={onClose} onSubmit={onSubmit} />
    </Dialog>
  );
}

const inputClass =
  "w-full rounded-md border border-hairline bg-canvas px-4 py-3 text-body-md text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none";

function NovelForm({ novel, onClose, onSubmit }: Omit<Props, "open">) {
  const [title, setTitle] = useState(novel?.title ?? "");
  const [genre, setGenre] = useState(novel?.genre ?? "");
  const [synopsis, setSynopsis] = useState(novel?.synopsis ?? "");
  const [cover, setCover] = useState<ResizedImage | null | undefined>(undefined);
  const [converting, setConverting] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = useLiveQuery(
    () => (novel?.coverImageId ? db.images.get(novel.coverImageId) : undefined),
    [novel?.coverImageId],
  );
  const preview = cover === undefined ? saved?.blob : cover?.blob;

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setConverting(true);
    setCoverError("");
    try {
      setCover(await resizeImage(file));
    } catch {
      setCoverError("이미지를 변환하지 못했습니다. 다른 파일을 골라 주세요.");
    } finally {
      setConverting(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          genre: genre.trim() || undefined,
          synopsis: synopsis.trim() || undefined,
        },
        cover,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-6">
      <div className="w-32 shrink-0">
        <label className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-muted-soft bg-surface-soft text-center text-caption text-muted">
          {preview ? (
            <BlobImage
              blob={preview}
              alt="표지 미리보기"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <>
              <ImagePlus size={20} />
              표지 이미지
              <br />
              (선택)
            </>
          )}
          {converting && (
            <span className="absolute inset-x-0 bottom-0 bg-surface-dark/70 py-1 text-on-primary">
              변환 중…
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            aria-label="표지 이미지"
            className="sr-only"
            onChange={(e) => void pickCover(e.target.files?.[0])}
          />
        </label>
        {preview && !converting && (
          <button
            type="button"
            className="mt-2 flex items-center gap-1 text-caption text-muted"
            onClick={() => setCover(null)}
          >
            <X size={12} /> 표지 제거
          </button>
        )}
        {coverError && <p className="mt-2 text-caption text-error">{coverError}</p>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <label className="flex flex-col gap-1 text-body-sm text-ink">
          제목 *
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-ink">
          장르
          <input
            className={inputClass}
            value={genre}
            placeholder="예: 판타지, 무협, 로맨스"
            onChange={(e) => setGenre(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-ink">
          소개 (시놉시스)
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={synopsis}
            placeholder="작품 소개를 적어 두면 서재에서 구분하기 쉬워요"
            onChange={(e) => setSynopsis(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="primary" disabled={!title.trim() || converting || saving}>
            {novel ? "저장" : "만들기"}
          </Button>
        </div>
      </div>
    </form>
  );
}
