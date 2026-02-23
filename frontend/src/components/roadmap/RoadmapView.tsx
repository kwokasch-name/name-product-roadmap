import { useScopedInitiatives } from '../../hooks/useInitiatives';
import { useOKRs } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { TimelineHeader, MONTH_WIDTH } from './TimelineHeader';
import { WorkstreamLane } from './WorkstreamLane';
import { TodayLine } from './TodayLine';
import { Button } from '../ui/Button';
import { useRef, useEffect, useMemo } from 'react';
import { getMonthsBetween } from '../../lib/dateUtils';

export function RoadmapView() {
  const { data: initiatives, isLoading } = useScopedInitiatives();
  const { data: okrs } = useOKRs();
  const { viewStartDate, viewEndDate, setViewRange, setIsInitiativeFormOpen, selectedOKRIds, visiblePods, togglePodVisibility } = useRoadmapContext();
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

  const allPods = ['Retail Therapy', 'JSON ID', 'Migration'] as const;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Roadmap</h2>
        <div className="flex items-center gap-3">
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

          {/* Pod filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 mr-0.5">
              <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Pods
            </span>
            {allPods.map((pod) => {
              const isActive = visiblePods.has(pod);
              return (
                <button
                  key={pod}
                  onClick={() => togglePodVisibility(pod)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                    isActive
                      ? pod === 'Retail Therapy'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : pod === 'JSON ID'
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : 'bg-orange-50 text-orange-700 border-orange-300'
                      : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
                  }`}
                  title={isActive ? `Hide ${pod}` : `Show ${pod}`}
                >
                  {pod}
                </button>
              );
            })}
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
          <div className="relative" style={{ width: 'max-content' }}>
            <TimelineHeader startDate={viewStartDate} endDate={viewEndDate} />
            {visiblePods.has('Retail Therapy') && (
              <WorkstreamLane
                title="Retail Therapy"
                initiatives={retailTherapyInitiatives}
                viewStart={viewStartDate}
                viewEnd={viewEndDate}
                allOkrIds={allOkrIds}
              />
            )}
            {visiblePods.has('JSON ID') && (
              <WorkstreamLane
                title="JSON ID"
                initiatives={jsonIdInitiatives}
                viewStart={viewStartDate}
                viewEnd={viewEndDate}
                allOkrIds={allOkrIds}
              />
            )}
            {visiblePods.has('Migration') && (
              <WorkstreamLane
                title="Migration"
                initiatives={migrationInitiatives}
                viewStart={viewStartDate}
                viewEnd={viewEndDate}
                allOkrIds={allOkrIds}
              />
            )}
            {/* Today indicator line — overlays all lanes */}
            <TodayLine viewStart={viewStartDate} viewEnd={viewEndDate} />
          </div>
        )}
      </div>
    </div>
  );
}
