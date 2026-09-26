import type { ISODate, Novel } from "./types";

// UC-41 기본값 (조정 가능)
export const BACKUP_AFTER_DAYS = 7;
export const FIRST_NOTICE_DAYS = 3;
export const SNOOZE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: ISODate, now: Date) =>
  Math.floor((now.getTime() - Date.parse(from)) / DAY_MS);

export const snoozeUntil = (now: Date): ISODate =>
  new Date(now.getTime() + SNOOZE_DAYS * DAY_MS).toISOString();

// 표시할 알림. daysSince = 마지막 내보내기 후 일수, null = 한 번도 안 함
export function backupNotice(
  novel: Novel,
  snoozedUntil: ISODate | undefined,
  now: Date,
): { daysSince: number | null } | null {
  if (snoozedUntil && now.getTime() < Date.parse(snoozedUntil)) return null;
  const { lastExportedAt } = novel;
  if (!lastExportedAt) {
    return daysBetween(novel.createdAt, now) >= FIRST_NOTICE_DAYS ? { daysSince: null } : null;
  }
  if (Date.parse(novel.updatedAt) <= Date.parse(lastExportedAt)) return null;
  const daysSince = daysBetween(lastExportedAt, now);
  return daysSince >= BACKUP_AFTER_DAYS ? { daysSince } : null;
}
