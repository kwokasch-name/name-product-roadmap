import { useScopedInitiatives } from '../../hooks/useInitiatives';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { TimelineHeader } from './TimelineHeader';
import { WorkstreamLane } from './WorkstreamLane';
import { Button } from '../ui/Button';

export function RoadmapView() {
  const { data: initiatives, isLoading } = useScopedInitiatives();
  const { viewStartDate, viewEndDate, setViewRange, setIsInitiativeFormOpen } = useRoadmapContext();

  const retailTherapyInitiatives = initiatives?.filter((i) => i.pod === 'Retail Therapy') || [];
  const jsonIdInitiatives = initiatives?.filter((i) => i.pod === 'JSON ID') || [];

  const handlePrevious = () => {
    const newStart = new Date(viewStartDate);
    const newEnd = new Date(viewEndDate);
    newStart.setMonth(newStart.getMonth() - 1);
    newEnd.setMonth(newEnd.getMonth() - 1);
    setViewRange(newStart, newEnd);
  };

  const handleNext = () => {
    const newStart = new Date(viewStartDate);
    const newEnd = new Date(viewEndDate);
    newStart.setMonth(newStart.getMonth() + 1);
    newEnd.setMonth(newEnd.getMonth() + 1);
    setViewRange(newStart, newEnd);
  };

  const handleToday = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);
    setViewRange(start, end);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Roadmap</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-md">
            <Button variant="ghost" size="sm" onClick={handlePrevious}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNext}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
          <Button size="sm" onClick={() => setIsInitiativeFormOpen(true)}>
            + Add Initiative
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-lg m-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
        ) : (
          <>
            <TimelineHeader startDate={viewStartDate} endDate={viewEndDate} />
            <WorkstreamLane
              title="Retail Therapy"
              initiatives={retailTherapyInitiatives}
              viewStart={viewStartDate}
              viewEnd={viewEndDate}
            />
            <WorkstreamLane
              title="JSON ID"
              initiatives={jsonIdInitiatives}
              viewStart={viewStartDate}
              viewEnd={viewEndDate}
            />
          </>
        )}
      </div>
    </div>
  );
}
