/** Format date as YYYY-MM-DD in local timezone */
export function formatLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Quick ranges for due date filters (week starts Monday).
 * @returns {{ today: {due_from: string, due_to: string}, thisWeek: object, thisMonth: object }}
 */
export function getDueDatePresets() {
  const now = new Date();
  const today = formatLocalYmd(now);

  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    today: { due_from: today, due_to: today },
    thisWeek: { due_from: formatLocalYmd(monday), due_to: formatLocalYmd(sunday) },
    thisMonth: { due_from: formatLocalYmd(monthStart), due_to: formatLocalYmd(monthEnd) },
  };
}
