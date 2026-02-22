import { useState } from 'react';
import { useUnscopedInitiatives, useUpdateInitiative } from '../../hooks/useInitiatives';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { Button } from '../ui/Button';
import type { Initiative } from '../../types';

function InitiativeRow({ initiative }: { initiative: Initiative }) {
  const { setEditingInitiative } = useRoadmapContext();
  const updateInitiative = useUpdateInitiative();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSchedule = () => {
    if (startDate && endDate) {
      updateInitiative.mutate({
        id: initiative.id,
        data: { startDate, endDate },
      });
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900">
        <button
          onClick={() => setEditingInitiative(initiative)}
          className="font-medium text-indigo-600 hover:text-indigo-800 text-left"
        >
          {initiative.title}
        </button>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
            initiative.pod === 'Retail Therapy'
              ? 'bg-indigo-100 text-indigo-700'
              : initiative.pod === 'JSON ID'
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {initiative.pod}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {initiative.okrs && initiative.okrs.length > 0
          ? initiative.okrs.map((o) => o.title).join(', ')
          : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center">{initiative.developerCount}</td>
      <td className="px-4 py-3 text-sm">
        {initiative.jiraEpicKey ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <span className="inline-flex items-center justify-center w-3 h-3 rounded-sm bg-blue-600 text-white" style={{ fontSize: '8px', fontWeight: 700 }}>J</span>
            {initiative.jiraEpicKey}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-32 text-sm border border-gray-300 rounded px-2 py-1"
            placeholder="Start"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-32 text-sm border border-gray-300 rounded px-2 py-1"
            placeholder="End"
          />
          <Button
            size="sm"
            disabled={!startDate || !endDate || updateInitiative.isPending}
            onClick={handleSchedule}
          >
            {updateInitiative.isPending ? '...' : 'Schedule'}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function UnscopedTable() {
  const { data: initiatives, isLoading } = useUnscopedInitiatives();
  const { setIsInitiativeFormOpen } = useRoadmapContext();

  return (
    <div className="bg-white border border-gray-200 rounded-lg mx-4 mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-md font-semibold text-gray-900">
          Unscoped Initiatives
          {initiatives && initiatives.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({initiatives.length} items)
            </span>
          )}
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setIsInitiativeFormOpen(true)}>
          + Add Initiative
        </Button>
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
      ) : initiatives?.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          No unscoped initiatives. All initiatives have been scheduled.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pod
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OKR
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devs
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jira
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initiatives?.map((initiative) => (
                <InitiativeRow key={initiative.id} initiative={initiative} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
