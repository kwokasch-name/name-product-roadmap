import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { useCreateOKR } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';

export function OKRForm() {
  const { isOKRFormOpen, setIsOKRFormOpen } = useRoadmapContext();
  const createOKR = useCreateOKR();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeFrame, setTimeFrame] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createOKR.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        timeFrame: timeFrame.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setTimeFrame('');
          setIsOKRFormOpen(false);
        },
      }
    );
  };

  return (
    <Modal isOpen={isOKRFormOpen} onClose={() => setIsOKRFormOpen(false)} title="Add OKR">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="Increase customer retention"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="Describe the objective..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Time Frame"
          placeholder="Q1 2026"
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => setIsOKRFormOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || createOKR.isPending}>
            {createOKR.isPending ? 'Adding...' : 'Add OKR'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
