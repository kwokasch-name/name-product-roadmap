import { useScopedInitiatives } from '../../hooks/useInitiatives';
import { useOKRs } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { TimelineHeader, MONTH_WIDTH } from './TimelineHeader';
import { WorkstreamLane } from './WorkstreamLane';
import { Button } from '../ui/Button';
import { useRef, useEffect, useMemo } from 'react';
import { getMonthsBetween } from '../../lib/dateUtils';

export function RoadmapView() {
  const { data: initiatives, isLoading } = useScopedInitiatives();
  const { data: okrs } = useOKRs();
  const { viewStartDate, viewEndDate, setViewRange, setIsInitiativeFormOpen, selectedOKRIds } = useRoadmapContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sorted list of all OKR IDs — used for deterministic color assignment
  const allOkrIds = useMemo(
    () => (okrs || []).map((o) => o.id).sort(),
    [okrs]
  );

  // Filter initiatives based on selected OKRs
  // If no OKRs are selected, show all initiatives
  // If OKRs are selected, only show initiatives linked to those OKRs
  const filteredInitiatives = selectedOKRIds.size > 0
    ? initiatives?.filter((i) => i.okrIds.some((id) => selectedOKRIds.has(id))) || []
    : initiatives || [];

  const retailTherapyInitiatives = filteredInitiatives.filter((i) => i.pod === 'Retail Therapy');
  const jsonIdInitiatives = filteredInitiatives.filter((i) => i.pod === 'JSON ID');
  const migrationInitiatives = filteredInitiatives.filter((i) => i.pod === 'Migration');

  // Auto-center on current month on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const months = getMonthsBetween(viewStartDate, viewEndDate);
      const currentMonthIndex = months.findIndex(
        (month) => month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear()
      );

      if (currentMonthIndex >= 0) {
        const containerWidth = scrollContainerRef.current.offsetWidth;
        // Center the current month: scroll to show current month in the middle
        const scrollPosition = currentMonthIndex * MONTH_WIDTH - containerWidth / 2 + MONTH_WIDTH / 2;
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [viewStartDate, viewEndDate]);

  const handlePrevious = () => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollBy({ left: -containerWidth, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollBy({ left: containerWidth, behavior: 'smooth' });
    }
  };

  const handleToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    // Ensure view range is set to current year
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    
    // Update range if needed
    if (viewStartDate.getFullYear() !== year || viewEndDate.getFullYear() !== year) {
      setViewRange(start, end);
    }

    // Scroll to current month after a brief delay to allow range update
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const months = getMonthsBetween(start, end);
        const currentMonthIndex = months.findIndex(
          (month) => month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear()
        );

        if (currentMonthIndex >= 0) {
          const containerWidth = scrollContainerRef.current.offsetWidth;
          const scrollPosition = currentMonthIndex * MONTH_WIDTH - containerWidth / 2 + MONTH_WIDTH / 2;
          scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
      }
    }, 0);
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

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto bg-white border border-gray-200 rounded-lg m-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
        ) : (
          <div style={{ width: 'max-content' }}>
            <TimelineHeader startDate={viewStartDate} endDate={viewEndDate} />
            <WorkstreamLane
              title="Retail Therapy"
              initiatives={retailTherapyInitiatives}
              viewStart={viewStartDate}
              viewEnd={viewEndDate}
              allOkrIds={allOkrIds}
            />
            <WorkstreamLane
              title="JSON ID"
              initiatives={jsonIdInitiatives}
              viewStart={viewStartDate}
              viewEnd={viewEndDate}
              allOkrIds={allOkrIds}
            />
            <WorkstreamLane
              title="Migration"
              initiatives={migrationInitiatives}
              viewStart={viewStartDate}
              viewEnd={viewEndDate}
              allOkrIds={allOkrIds}
            />
          </div>
        )}
      </div>
    </div>
  );
}
