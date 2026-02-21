import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { useCreateInitiative, useUpdateInitiative, useDeleteInitiative } from '../../hooks/useInitiatives';
import { useOKRs } from '../../hooks/useOKRs';
import { useJiraStatus, useJiraEpicSearch, useSyncInitiative } from '../../hooks/useJira';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { toInputDate } from '../../lib/dateUtils';
import type { Pod, InitiativeStatus, JiraEpic } from '../../types';

const podOptions = [
  { value: 'Retail Therapy', label: 'Retail Therapy' },
  { value: 'JSON ID', label: 'JSON ID' },
];

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

export function InitiativeForm() {
  const { isInitiativeFormOpen, setIsInitiativeFormOpen, editingInitiative, setEditingInitiative } = useRoadmapContext();
  const { data: okrs } = useOKRs();
  const { data: jiraStatus } = useJiraStatus();
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative();
  const deleteInitiative = useDeleteInitiative();
  const syncInitiative = useSyncInitiative();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pod, setPod] = useState<Pod>('Retail Therapy');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [developerCount, setDeveloperCount] = useState('1');
  const [okrId, setOkrId] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('planned');

  // Jira state
  const [jiraEpicKey, setJiraEpicKey] = useState<string | null>(null);
  const [jiraSyncEnabled, setJiraSyncEnabled] = useState(true);
  const [jiraSearch, setJiraSearch] = useState('');
  const [showJiraDropdown, setShowJiraDropdown] = useState(false);
  const jiraSearchRef = useRef<HTMLDivElement>(null);

  const { data: jiraResults, isFetching: jiraSearching } = useJiraEpicSearch(jiraSearch);
  const jiraConfigured = jiraStatus?.configured ?? false;

  const isEditing = !!editingInitiative;
  const isOpen = isInitiativeFormOpen || isEditing;

  useEffect(() => {
    if (editingInitiative) {
      setTitle(editingInitiative.title);
      setDescription(editingInitiative.description || '');
      setPod(editingInitiative.pod);
      setStartDate(toInputDate(editingInitiative.startDate));
      setEndDate(toInputDate(editingInitiative.endDate));
      setDeveloperCount(String(editingInitiative.developerCount));
      setOkrId(editingInitiative.okrId ? String(editingInitiative.okrId) : '');
      setSuccessCriteria(editingInitiative.successCriteria || '');
      setStatus(editingInitiative.status);
      setJiraEpicKey(editingInitiative.jiraEpicKey ?? null);
      setJiraSyncEnabled(editingInitiative.jiraSyncEnabled ?? true);
    } else {
      resetForm();
    }
  }, [editingInitiative]);

  // Close Jira dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (jiraSearchRef.current && !jiraSearchRef.current.contains(e.target as Node)) {
        setShowJiraDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPod('Retail Therapy');
    setStartDate('');
    setEndDate('');
    setDeveloperCount('1');
    setOkrId('');
    setSuccessCriteria('');
    setStatus('planned');
    setJiraEpicKey(null);
    setJiraSyncEnabled(true);
    setJiraSearch('');
    setShowJiraDropdown(false);
  };

  const handleClose = () => {
    setIsInitiativeFormOpen(false);
    setEditingInitiative(null);
    resetForm();
  };

  const handleJiraEpicSelect = (epic: JiraEpic) => {
    setJiraEpicKey(epic.key);
    setJiraSearch('');
    setShowJiraDropdown(false);
    // Pre-fill fields from Jira
    if (!title) setTitle(epic.summary);
    if (!description && epic.description) setDescription(epic.description);
    if (epic.startDate) setStartDate(epic.startDate);
    if (epic.dueDate) setEndDate(epic.dueDate);
    const mappedStatus: Record<string, InitiativeStatus> = {
      'done': 'completed', 'closed': 'completed', 'resolved': 'completed',
      'in progress': 'in_progress', 'in development': 'in_progress',
      'blocked': 'blocked',
    };
    const mapped = mappedStatus[epic.status.toLowerCase()];
    if (mapped) setStatus(mapped);
  };

  const handleUnlinkJira = () => {
    setJiraEpicKey(null);
    setJiraSyncEnabled(true);
  };

  const handleSyncNow = () => {
    if (editingInitiative) {
      syncInitiative.mutate(editingInitiative.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      pod,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      developerCount: parseInt(developerCount) || 1,
      okrId: okrId ? parseInt(okrId) : undefined,
      successCriteria: successCriteria.trim() || undefined,
      status,
      jiraEpicKey: jiraEpicKey || undefined,
      jiraSyncEnabled,
    };

    if (isEditing && editingInitiative) {
      updateInitiative.mutate(
        { id: editingInitiative.id, data },
        { onSuccess: handleClose }
      );
    } else {
      createInitiative.mutate(data, { onSuccess: handleClose });
    }
  };

  const handleDelete = () => {
    if (editingInitiative && confirm('Are you sure you want to delete this initiative?')) {
      deleteInitiative.mutate(editingInitiative.id, { onSuccess: handleClose });
    }
  };

  const okrOptions = [
    { value: '', label: 'No OKR' },
    ...(okrs?.map((okr) => ({ value: String(okr.id), label: okr.title })) || []),
  ];

  const formatSyncTime = (ts: string | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return d.toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Edit Initiative' : 'Add Initiative'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="Build authentication system"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Description"
          placeholder="Describe the initiative..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Select
          label="Pod"
          value={pod}
          onChange={(e) => setPod(e.target.value as Pod)}
          options={podOptions}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Developers Required"
            type="number"
            min="1"
            value={developerCount}
            onChange={(e) => setDeveloperCount(e.target.value)}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as InitiativeStatus)}
            options={statusOptions}
          />
        </div>

        <Select
          label="Maps to OKR"
          value={okrId}
          onChange={(e) => setOkrId(e.target.value)}
          options={okrOptions}
        />

        <Textarea
          label="What Success Looks Like"
          placeholder="Describe what success looks like for this initiative..."
          value={successCriteria}
          onChange={(e) => setSuccessCriteria(e.target.value)}
        />

        {/* Jira Integration Section */}
        {jiraConfigured && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Jira Epic</span>
              {jiraEpicKey && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.95 4.34 4.34 4.35V3.5a1.5 1.5 0 0 0-1.5-1.5H11.53z" />
                    <path d="M6.77 6.8c0 2.4 1.96 4.34 4.35 4.35h1.78v1.71c0 2.4 1.95 4.34 4.35 4.35V8.3a1.5 1.5 0 0 0-1.5-1.5H6.77z" />
                    <path d="M2 11.6c0 2.4 1.96 4.34 4.35 4.34h1.78v1.72c0 2.4 1.96 4.34 4.35 4.34V13.1a1.5 1.5 0 0 0-1.5-1.5H2z" />
                  </svg>
                  {jiraEpicKey}
                </span>
              )}
            </div>

            {jiraEpicKey ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Last synced: {formatSyncTime(editingInitiative?.jiraLastSyncedAt ?? null)}
                  </span>
                  <div className="flex gap-2">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={syncInitiative.isPending}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {syncInitiative.isPending ? 'Syncing...' : 'Sync now'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUnlinkJira}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jiraSyncEnabled}
                    onChange={(e) => setJiraSyncEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs text-gray-600">Keep in sync with Jira</span>
                </label>
              </div>
            ) : (
              <div ref={jiraSearchRef} className="relative">
                <input
                  type="text"
                  placeholder="Search by epic key or title (e.g. PROJ-123)"
                  value={jiraSearch}
                  onChange={(e) => {
                    setJiraSearch(e.target.value);
                    setShowJiraDropdown(true);
                  }}
                  onFocus={() => jiraSearch.length >= 2 && setShowJiraDropdown(true)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {jiraSearching && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</span>
                )}
                {showJiraDropdown && jiraResults && jiraResults.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {jiraResults.map((epic) => (
                      <li key={epic.key}>
                        <button
                          type="button"
                          onClick={() => handleJiraEpicSelect(epic)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          <span className="font-medium text-blue-700">{epic.key}</span>
                          <span className="ml-2 text-gray-700">{epic.summary}</span>
                          <span className="ml-2 text-xs text-gray-400">{epic.status}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showJiraDropdown && jiraSearch.length >= 2 && !jiraSearching && jiraResults?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
                    No epics found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          {isEditing && (
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <div className={`flex gap-3 ${!isEditing ? 'ml-auto' : ''}`}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {isEditing ? 'Save Changes' : 'Add Initiative'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
