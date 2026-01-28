import { useOKRs } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { OKRCard } from './OKRCard';
import { OKRForm } from './OKRForm';
import { Button } from '../ui/Button';
import type { OKR } from '../../types';

export function OKRList() {
  const { data: okrs, isLoading } = useOKRs();
  const { setIsOKRFormOpen, selectedOKRIds, selectAllOKRs, deselectAllOKRs } = useRoadmapContext();

  // Filter OKRs to only show January - March
  const filteredOKRs = okrs?.filter((okr) => {
    if (!okr.timeFrame) return false;
    const timeFrameLower = okr.timeFrame.toLowerCase();
    return (
      timeFrameLower.includes('jan') ||
      timeFrameLower.includes('feb') ||
      timeFrameLower.includes('mar') ||
      timeFrameLower.includes('q1')
    );
  }) || [];

  // Group OKRs by sections
  const companyOKRs = filteredOKRs.filter(okr => okr.isCompanyWide);
  const bothPodsOKRs = filteredOKRs.filter(okr => 
    !okr.isCompanyWide && okr.pods.length === 2
  );
  const retailTherapyOKRs = filteredOKRs.filter(okr => 
    !okr.isCompanyWide && okr.pods.length === 1 && okr.pods.includes('Retail Therapy')
  );
  const jsonIdOKRs = filteredOKRs.filter(okr => 
    !okr.isCompanyWide && okr.pods.length === 1 && okr.pods.includes('JSON ID')
  );

  const renderSection = (title: string, okrs: OKR[], sectionId: string) => {
    if (okrs.length === 0) return null;
    return (
      <div key={sectionId} className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 px-1">{title}</h3>
        <div className="space-y-2">
          {okrs.map((okr) => (
            <OKRCard key={okr.id} okr={okr} />
          ))}
        </div>
      </div>
    );
  };

  const allOKRIds = filteredOKRs.map(okr => okr.id);
  const allSelected = filteredOKRs.length > 0 && filteredOKRs.every(okr => selectedOKRIds.has(okr.id));

  const handleSelectAll = () => {
    if (allSelected) {
      deselectAllOKRs();
    } else {
      selectAllOKRs(allOKRIds);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">OKRs</h2>
        <div className="flex items-center gap-2">
          {filteredOKRs.length > 0 && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleSelectAll}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          <Button size="sm" onClick={() => setIsOKRFormOpen(true)}>
            + Add
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-sm text-gray-500 text-center py-4">Loading...</div>
        )}
        {!isLoading && filteredOKRs.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">
            No OKRs for January - March. Add one to get started.
          </div>
        )}
        {!isLoading && filteredOKRs.length > 0 && (
          <div>
            {renderSection('Company-wide', companyOKRs, 'company')}
            {renderSection('Retail Therapy', retailTherapyOKRs, 'retail-therapy')}
            {renderSection('JSON ID', jsonIdOKRs, 'json-id')}
            {renderSection('Both Pods', bothPodsOKRs, 'both-pods')}
          </div>
        )}
      </div>

      <OKRForm />
    </div>
  );
}
