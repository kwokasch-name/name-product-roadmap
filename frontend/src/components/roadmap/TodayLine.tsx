import { getTodayOffset, getMonthsBetween } from '../../lib/dateUtils';
import { MONTH_WIDTH, POD_LABEL_WIDTH } from './TimelineHeader';

interface TodayLineProps {
  viewStart: Date;
  viewEnd: Date;
}

export function TodayLine({ viewStart, viewEnd }: TodayLineProps) {
  const months = getMonthsBetween(viewStart, viewEnd);
  const totalWidth = months.length * MONTH_WIDTH;
  const offset = getTodayOffset(viewStart, viewEnd, totalWidth);

  if (offset === null) return null;

  // Offset by the pod label column width
  const left = POD_LABEL_WIDTH + offset;

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left }}
    >
      {/* Small red dot at the top */}
      <div className="absolute -top-0.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500" />
      {/* Vertical line */}
      <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-70" />
    </div>
  );
}
