import type { Row } from "./api";

/** Report visuals may only summarize rows explicitly tied to the selected child. */
export function rowsForReportChild(rows: readonly Row[], childId?: string) {
  if (!childId) return [];
  return rows.filter((row) => String(row.child) === childId);
}
