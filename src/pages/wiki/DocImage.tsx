import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus, X } from "lucide-react";
import BlobImage from "../../components/BlobImage";
import { db } from "../../db/db";
import { deleteImage, resizeImage, saveImage } from "../../db/images";
import type { WikiDoc } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { updateDoc } from "../../store/wikiActions";

// 대표 이미지 (UC-31 ④): 긴 변 1600px WebP 변환(Worker, C8) 중 진행 표시, 실패해도 문서 편집은 계속
export default function DocImage({ doc }: { doc: WikiDoc }) {
  const asset = useLiveQuery(
    () => (doc.imageId ? db.images.get(doc.imageId) : undefined),
    [doc.imageId],
  );
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");

  // 이전 이미지는 교체 · 제거 후 삭제 (문서 변경은 실행 취소 기록 밖)
  const replace = (imageId: string | undefined) => {
    const old = useNovelStore.getState().docs[doc.id]?.imageId;
    updateDoc(doc.id, { imageId });
    if (old && old !== imageId) void deleteImage(old);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setConverting(true);
    setError("");
    try {
      replace(await saveImage(doc.novelId, await resizeImage(file)));
    } catch {
      setError("이미지를 변환하지 못했어요. 다른 파일을 골라 주세요.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="w-60 shrink-0">
      <label className="relative flex h-75 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-muted-soft bg-surface-soft text-caption text-muted">
        {asset ? (
          <BlobImage
            blob={asset.blob}
            alt="대표 이미지"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <>
            <ImagePlus size={20} />
            대표 이미지
          </>
        )}
        {converting && (
          <span className="absolute inset-x-0 bottom-0 bg-surface-dark/70 py-1 text-center text-on-primary">
            변환 중…
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          aria-label="대표 이미지"
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <div className="mt-1.5 flex items-center justify-between text-caption text-muted">
        <span>클릭해 {asset ? "교체" : "추가"}</span>
        {doc.imageId && !converting && (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-ink"
            onClick={() => replace(undefined)}
          >
            <X size={12} /> 이미지 제거
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-caption text-error">{error}</p>}
    </div>
  );
}
