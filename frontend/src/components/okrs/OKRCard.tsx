import { useState } from 'react';
import type { OKR } from '../../types';
import { useDeleteOKR } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { OKRForm } from './OKRForm';
import { InitiativeForm } from '../initiatives/InitiativeForm';

interface OKRCardProps {
  okr: OKR;
}

export function OKRCard({ okr }: OKRCardProps) {
  const deleteOKR = useDeleteOKR();
  const { selectedOKRIds, toggleOKRSelection } = useRoadmapContext();
  const isSelected = selectedOKRIds.has(okr.id);

  const [isEditing, setIsEditing] = useState(false);
  const [isAddingInitiative, setIsAddingInitiative] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this OKR?')) {
      deleteOKR.mutate(okr.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleAddInitiative = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddingInitiative(true);
  };

  // Determine scope label and color
  const scopeBadges = okr.isCompanyWide
    ? [{ label: 'Company-wide', className: 'bg-purple-100 text-purple-700' }]
    : okr.pods.map((pod) => ({
        label: pod,
        className: pod === 'Retail Therapy'
          ? 'bg-indigo-100 text-indigo-700'
          : pod === 'JSON ID'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-orange-100 text-orange-700',
      }));

  return (
    <>
      <div
        className={`rounded-lg border cursor-pointer transition-all ${
          isSelected
            ? 'border-indigo-400 bg-indigo-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
        }`}
        onClick={() => toggleOKRSelection(okr.id)}
      >
        {/* Colored left accent bar */}
        <div className="flex rounded-lg overflow-hidden">
          <div className={`w-1 flex-shrink-0 ${isSelected ? 'bg-indigo-500' : 'bg-indigo-300'}`} />

          <div className="flex-1 p-3">
            {/* Header: checkbox + title + action buttons */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOKRSelection(okr.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <h4 className="flex-1 text-sm font-bold text-indigo-700 leading-snug">
                {okr.title}
              </h4>

              {/* Edit button */}
              <button
                onClick={handleEdit}
                title="Edit OKR"
                className="flex-shrink-0 text-gray-300 hover:text-indigo-400 transition-colors p-0.5 -mt-0.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                title="Delete OKR"
                className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors p-0.5 -mt-0.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Time window + scope badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-5">
              {okr.timeFrame ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {okr.timeFrame}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">No time frame</span>
              )}
              {scopeBadges.length > 0 ? (
                scopeBadges.map(({ label, className }) => (
                  <span key={label} className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${className}`}>
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">No scope</span>
              )}
            </div>

            {/* Key results */}
            {okr.keyResults && okr.keyResults.length > 0 && (
              <div className="mt-2 ml-5 space-y-1">
                {okr.keyResults.map((kr) => (
                  <div key={kr.id} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-indigo-300 rounded-full flex-shrink-0" />
                    <span className="truncate">{kr.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add Initiative shortcut */}
            <div className="mt-2 ml-5">
              <button
                onClick={handleAddInitiative}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Initiative
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit OKR modal — rendered outside the card div to avoid click propagation issues */}
      {isEditing && (
        <OKRForm
          okr={okr}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Add Initiative modal pre-linked to this OKR */}
      {isAddingInitiative && (
        <InitiativeForm
          defaultOkrId={okr.id}
          isOpen={isAddingInitiative}
          onClose={() => setIsAddingInitiative(false)}
        />
      )}
    </>
  );
}
