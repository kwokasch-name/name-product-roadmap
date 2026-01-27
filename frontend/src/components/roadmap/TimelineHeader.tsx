import { getMonthsBetween, formatMonth } from '../../lib/dateUtils';

export const MONTH_WIDTH = 400; // pixels per month - must match WorkstreamLane and RoadmapView

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
}

export function TimelineHeader({ startDate, endDate }: TimelineHeaderProps) {
  const months = getMonthsBetween(startDate, endDate);

  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      <div className="w-32 flex-shrink-0 px-3 py-2 border-r border-gray-200">
        <span className="text-xs font-medium text-gray-500">Pod</span>
      </div>
      <div className="flex" style={{ width: months.length * MONTH_WIDTH }}>
        {months.map((month, index) => (
          <div
            key={index}
            className="px-2 py-2 text-center border-r border-gray-200 last:border-r-0"
            style={{ width: MONTH_WIDTH }}
          >
            <span className="text-xs font-medium text-gray-600">{formatMonth(month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
