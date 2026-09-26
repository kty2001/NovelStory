import { useEffect, useState } from "react";
import { backupNotice, snoozeUntil } from "../db/backup";
import { db } from "../db/db";
import { patchUiState } from "../db/uiState";
import { useNovelStore } from "../store/novelStore";

type Notice = ReturnType<typeof backupNotice>;

// 백업 알림 (UC-41, A9): 소설을 열 때 1회 판단. "지금 내보내기"는 F0 내보내기 작업에서 연결
// 판단 기준은 불러온 시점의 소설 (열어 둔 동안 편집해도 다시 판단하지 않음)
export default function BackupBanner({ novelId }: { novelId: string }) {
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let active = true;
    void db.uiState.get(novelId).then((ui) => {
      const novel = useNovelStore.getState().novel;
      if (active && novel?.id === novelId) {
        setNotice(backupNotice(novel, ui?.backupSnoozedUntil, new Date()));
      }
    });
    return () => {
      active = false;
    };
  }, [novelId]);

  if (!notice) return null;

  const later = () => {
    setNotice(null);
    void patchUiState(novelId, { backupSnoozedUntil: snoozeUntil(new Date()) });
  };

  return (
    <div className="flex items-center gap-3 bg-surface-card px-4 py-2 text-body-sm">
      <b className="font-semibold text-ink">
        {notice.daysSince === null ? "아직 백업하지 않음" : `마지막 백업: ${notice.daysSince}일 전`}
      </b>
      <span className="text-muted">
        이 소설은 이 브라우저에만 저장됩니다. JSON으로 내보내 두세요.
      </span>
      <button className="ml-auto rounded-md px-3 py-2 text-button text-ink" onClick={later}>
        나중에
      </button>
    </div>
  );
}
