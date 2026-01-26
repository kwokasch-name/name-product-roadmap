import { getMonthsBetween, formatMonth } from '../../lib/dateUtils';

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
      <div className="flex-1 flex">
        {months.map((month, index) => (
          <div
            key={index}
            className="flex-1 px-2 py-2 text-center border-r border-gray-200 last:border-r-0"
          >
            <span className="text-xs font-medium text-gray-600">{formatMonth(month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
