import { getMonthsBetween, formatMonth } from '../../lib/dateUtils';

export const MONTH_WIDTH = 400; // pixels per month - must match WorkstreamLane and RoadmapView
export const POD_LABEL_WIDTH = 128; // w-32 = 8rem = 128px

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
}

/** Group consecutive months into quarters: { label: "Q1 2026", span: 3 } */
function getQuarterSpans(months: Date[]): { label: string; span: number }[] {
  if (months.length === 0) return [];

  const spans: { label: string; span: number }[] = [];
  let currentQ = getQuarterLabel(months[0]);
  let count = 1;

  for (let i = 1; i < months.length; i++) {
    const q = getQuarterLabel(months[i]);
    if (q === currentQ) {
      count++;
    } else {
      spans.push({ label: currentQ, span: count });
      currentQ = q;
      count = 1;
    }
  }
  spans.push({ label: currentQ, span: count });
  return spans;
}

function getQuarterLabel(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

export function TimelineHeader({ startDate, endDate }: TimelineHeaderProps) {
  const months = getMonthsBetween(startDate, endDate);
  const quarters = getQuarterSpans(months);

  return (
    <div className="sticky top-0 z-10 bg-gray-50">
      {/* Quarter row */}
      <div className="flex border-b border-gray-200">
        <div className="w-32 flex-shrink-0 border-r border-gray-200" />
        <div className="flex" style={{ width: months.length * MONTH_WIDTH }}>
          {quarters.map((q, index) => (
            <div
              key={index}
              className="px-2 py-1.5 text-center border-r border-gray-500 last:border-r-0"
              style={{ width: q.span * MONTH_WIDTH }}
            >
              <span className="text-xs font-semibold text-gray-700 tracking-wide uppercase">{q.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month row */}
      <div className="flex border-b border-gray-200">
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
    </div>
  );
}
