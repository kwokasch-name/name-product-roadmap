import { useOKRs } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { OKRCard } from './OKRCard';
import { OKRForm } from './OKRForm';
import { Button } from '../ui/Button';

export function OKRList() {
  const { data: okrs, isLoading } = useOKRs();
  const { setIsOKRFormOpen } = useRoadmapContext();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">OKRs</h2>
        <Button size="sm" onClick={() => setIsOKRFormOpen(true)}>
          + Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading && (
          <div className="text-sm text-gray-500 text-center py-4">Loading...</div>
        )}
        {!isLoading && okrs?.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">
            No OKRs yet. Add one to get started.
          </div>
        )}
        {okrs?.map((okr) => (
          <OKRCard key={okr.id} okr={okr} />
        ))}
      </div>

      <OKRForm />
    </div>
  );
}
