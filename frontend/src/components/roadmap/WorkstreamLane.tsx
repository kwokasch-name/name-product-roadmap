import { useRef } from 'react';
import { InitiativeBar } from './InitiativeBar';
import { getInitiativePosition, getMonthsBetween } from '../../lib/dateUtils';
import { MONTH_WIDTH } from './TimelineHeader';
import type { Initiative, Pod } from '../../types';

interface WorkstreamLaneProps {
  title: Pod;
  initiatives: Initiative[];
  viewStart: Date;
  viewEnd: Date;
}

const ROW_HEIGHT = 240;
const ROW_GAP = 8;

function assignRows(
  items: { initiative: Initiative; position: { left: number; width: number } }[]
): { initiative: Initiative; position: { left: number; width: number }; row: number }[] {
  const sorted = [...items].sort((a, b) => a.position.left - b.position.left);
  const rows: { end: number }[] = [];

  return sorted.map((item) => {
    const itemEnd = item.position.left + item.position.width;
    let assignedRow = 0;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].end <= item.position.left) {
        assignedRow = i;
        rows[i].end = itemEnd;
        return { ...item, row: assignedRow };
      }
    }

    assignedRow = rows.length;
    rows.push({ end: itemEnd });
    return { ...item, row: assignedRow };
  });
}

export function WorkstreamLane({ title, initiatives, viewStart, viewEnd }: WorkstreamLaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const months = getMonthsBetween(viewStart, viewEnd);
  const totalWidth = months.length * MONTH_WIDTH;

  const getPositionedInitiatives = () => {
    if (!totalWidth) return [];

    const items = initiatives
      .filter((init) => init.startDate && init.endDate)
      .map((init) => {
        const position = getInitiativePosition(
          init.startDate!,
          init.endDate!,
          viewStart,
          viewEnd,
          totalWidth
        );
        return position ? { initiative: init, position } : null;
      })
      .filter(Boolean) as { initiative: Initiative; position: { left: number; width: number } }[];

    return assignRows(items);
  };

  const positionedInitiatives = getPositionedInitiatives();
  const rowCount = positionedInitiatives.length > 0
    ? Math.max(...positionedInitiatives.map((p) => p.row)) + 1
    : 1;
  const laneHeight = Math.max(80, rowCount * ROW_HEIGHT + (rowCount + 1) * ROW_GAP);

  return (
    <div className="flex border-b border-gray-200" style={{ minHeight: laneHeight }}>
      <div className="w-32 flex-shrink-0 px-3 py-4 border-r border-gray-200 bg-gray-50">
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
            title === 'Retail Therapy'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {title}
        </span>
      </div>
      <div ref={containerRef} className="relative bg-white" style={{ width: totalWidth }}>
        {positionedInitiatives.map(({ initiative, position, row }) => (
          <InitiativeBar key={initiative.id} initiative={initiative} position={position} row={row} />
        ))}
        {positionedInitiatives.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            No initiatives scheduled
          </div>
        )}
      </div>
    </div>
  );
}
