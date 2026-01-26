import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { useCreateInitiative, useUpdateInitiative, useDeleteInitiative } from '../../hooks/useInitiatives';
import { useOKRs } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import { toInputDate } from '../../lib/dateUtils';
import type { Pod, InitiativeStatus } from '../../types';

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
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative();
  const deleteInitiative = useDeleteInitiative();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pod, setPod] = useState<Pod>('Retail Therapy');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [developerCount, setDeveloperCount] = useState('1');
  const [okrId, setOkrId] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('planned');

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
    } else {
      resetForm();
    }
  }, [editingInitiative]);

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
  };

  const handleClose = () => {
    setIsInitiativeFormOpen(false);
    setEditingInitiative(null);
    resetForm();
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
