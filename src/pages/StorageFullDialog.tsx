import { useEffect, useState } from "react";
import Button from "../components/Button";
import Dialog from "../components/Dialog";
import { db } from "../db/db";
import { formatBytes, imageUsageByNovel, storageUsage } from "../db/storage";

type Usage = Awaited<ReturnType<typeof storageUsage>>;
type Row = { novelId: string; title: string; count: number; bytes: number };

// L-5 저장 공간 부족 (UC-42): 사이트 사용량 + 이미지가 많은 소설 내보내기 권장. 작업공간 · 서재 가져오기 공용
export default function StorageFullDialog({
  open,
  onClose,
  onExport,
  onExportCurrent,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (novelId: string) => void;
  onExportCurrent?: () => void; // 작업공간: 열린 소설 (저장 안 된 변경 포함)
  onRetry?: () => void;
}) {
  const [usage, setUsage] = useState<Usage>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      const [u, images] = await Promise.all([storageUsage(), imageUsageByNovel()]);
      const novels = await db.novels.bulkGet(images.map((r) => r.novelId));
      if (!alive) return;
      setUsage(u);
      setRows(
        images.flatMap((r, i) => {
          const n = novels[i];
          return n && !n.deletedAt ? [{ ...r, title: n.title }] : [];
        }),
      );
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="저장 공간이 부족합니다"
      className="w-[min(600px,calc(100vw-32px))]"
      footer={
        <>
          <Button onClick={onClose}>닫기</Button>
          {onExportCurrent && <Button onClick={onExportCurrent}>이 소설 내보내기</Button>}
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              다시 시도
            </Button>
          )}
        </>
      }
    >
      <p className="text-body-sm">
        {onRetry
          ? "마지막 변경을 저장하지 못했습니다. 공간을 비운 뒤 다시 시도하세요."
          : "저장 공간이 부족해 가져오지 못했습니다. 공간을 비운 뒤 다시 가져오세요."}
      </p>
      {usage && (
        <>
          <p className="mt-3 flex text-caption text-muted">
            이 사이트 사용량
            <span data-testid="storage-usage" className="ml-auto tabular-nums">
              {formatBytes(usage.usage)} / {formatBytes(usage.quota)}
            </span>
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-card">
            <div
              className="h-full bg-error"
              style={{ width: `${Math.min(100, (usage.usage / usage.quota) * 100)}%` }}
            />
          </div>
        </>
      )}
      {rows.length > 0 && (
        <>
          <p className="mt-4 mb-1.5 text-caption text-muted">이미지가 많은 소설</p>
          <ul aria-label="이미지가 많은 소설" className="flex flex-col gap-1">
            {rows.map((r) => (
              <li
                key={r.novelId}
                className="flex items-center gap-2 rounded-md bg-surface-soft px-3 py-2 text-body-sm"
              >
                <span className="flex-1 truncate">{r.title}</span>
                <span className="text-caption text-muted tabular-nums">
                  이미지 {r.count} · {formatBytes(r.bytes)}
                </span>
                <Button size="sm" onClick={() => onExport(r.novelId)}>
                  내보내기
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-caption text-muted">
        내보낸 뒤 서재에서 소설을 삭제하면 공간이 확보됩니다.
      </p>
    </Dialog>
  );
}
