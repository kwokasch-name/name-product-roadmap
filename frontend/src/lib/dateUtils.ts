export function getDaysBetween(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getMonthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function toInputDate(date: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function getInitiativePosition(
  startDate: string,
  endDate: string,
  viewStart: Date,
  viewEnd: Date,
  containerWidth: number
): { left: number; width: number } | null {
  const initStart = new Date(startDate);
  const initEnd = new Date(endDate);

  // Check if initiative is in view
  if (initEnd < viewStart || initStart > viewEnd) return null;

  const viewDays = getDaysBetween(viewStart, viewEnd);
  const pixelsPerDay = containerWidth / viewDays;

  const clampedStart = initStart < viewStart ? viewStart : initStart;
  const clampedEnd = initEnd > viewEnd ? viewEnd : initEnd;

  const startOffset = getDaysBetween(viewStart, clampedStart);
  const duration = getDaysBetween(clampedStart, clampedEnd);

  return {
    left: startOffset * pixelsPerDay,
    width: Math.max(duration * pixelsPerDay, 60), // Minimum width of 60px
  };
}

/**
 * Returns the pixel offset of "today" from the start of the timeline.
 * Returns null if today is outside the view range.
 */
export function getTodayOffset(viewStart: Date, viewEnd: Date, totalWidth: number): number | null {
  const now = new Date();
  if (now < viewStart || now > viewEnd) return null;
  const viewDays = getDaysBetween(viewStart, viewEnd);
  if (viewDays <= 0) return null;
  const daysSinceStart = getDaysBetween(viewStart, now);
  return (daysSinceStart / viewDays) * totalWidth;
}

export function getDefaultViewRange(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  // Set to January 1st
  const start = new Date(year, 0, 1);
  // Set to December 31st (full year)
  const end = new Date(year, 11, 31);
  return { start, end };
}
