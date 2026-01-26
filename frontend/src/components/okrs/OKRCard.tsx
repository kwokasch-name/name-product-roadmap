import type { OKR } from '../../types';
import { useDeleteOKR } from '../../hooks/useOKRs';
import { Button } from '../ui/Button';

interface OKRCardProps {
  okr: OKR;
}

export function OKRCard({ okr }: OKRCardProps) {
  const deleteOKR = useDeleteOKR();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this OKR?')) {
      deleteOKR.mutate(okr.id);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{okr.title}</h4>
          {okr.timeFrame && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
              {okr.timeFrame}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 ml-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
      {okr.description && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{okr.description}</p>
      )}
      {okr.keyResults && okr.keyResults.length > 0 && (
        <div className="mt-3 space-y-1">
          {okr.keyResults.map((kr) => (
            <div key={kr.id} className="text-xs text-gray-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="truncate">{kr.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
