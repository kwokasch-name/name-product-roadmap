import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { useCreateOKR, useUpdateOKR } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import type { OKR, Pod } from '../../types';

const ALL_PODS: Pod[] = ['Retail Therapy', 'JSON ID', 'Migration'];

function generateTimeWindowOptions() {
  const currentYear = new Date().getFullYear();
  const options = [];

  // Add quarters for current year and next year
  for (let year = currentYear; year <= currentYear + 1; year++) {
    for (let q = 1; q <= 4; q++) {
      options.push({ value: `Q${q} ${year}`, label: `Q${q} ${year}` });
    }
  }

  // Add halves for current year and next year
  for (let year = currentYear; year <= currentYear + 1; year++) {
    options.push({ value: `H1 ${year}`, label: `H1 ${year}` });
    options.push({ value: `H2 ${year}`, label: `H2 ${year}` });
  }

  // Add full year for current year and next year
  for (let year = currentYear; year <= currentYear + 1; year++) {
    options.push({ value: `EOY ${year}`, label: `EOY ${year}` });
  }

  return options;
}

interface OKRFormProps {
  /** When provided, the form operates in edit mode pre-populated with this OKR's data */
  okr?: OKR;
  /** Override the open state (used when rendered from OKRCard) */
  isOpen?: boolean;
  /** Override the close handler (used when rendered from OKRCard) */
  onClose?: () => void;
}

export function OKRForm({ okr, isOpen: isOpenProp, onClose: onCloseProp }: OKRFormProps) {
  const { isOKRFormOpen, setIsOKRFormOpen } = useRoadmapContext();
  const createOKR = useCreateOKR();
  const updateOKR = useUpdateOKR();

  const isEditMode = !!okr;

  // Use prop-controlled open state if provided (edit mode from card),
  // otherwise fall back to context-controlled state (create mode from list header)
  const open = isOpenProp !== undefined ? isOpenProp : isOKRFormOpen;
  const handleClose = onCloseProp ?? (() => setIsOKRFormOpen(false));

  const [title, setTitle] = useState(okr?.title ?? '');
  const [description, setDescription] = useState(okr?.description ?? '');
  const [timeFrame, setTimeFrame] = useState(okr?.timeFrame ?? '');
  const [isCompanyWide, setIsCompanyWide] = useState(okr?.isCompanyWide ?? false);
  const [selectedPods, setSelectedPods] = useState<Pod[]>(okr?.pods ?? []);

  const handlePodToggle = (pod: Pod) => {
    setSelectedPods(prev =>
      prev.includes(pod) ? prev.filter(p => p !== pod) : [...prev, pod]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTimeFrame('');
    setIsCompanyWide(false);
    setSelectedPods([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isCompanyWide && selectedPods.length === 0) {
      alert('Please select at least one pod or mark as company-wide');
      return;
    }

    const formData = {
      title: title.trim(),
      description: description.trim() || undefined,
      timeFrame: timeFrame.trim() || undefined,
      isCompanyWide,
      pods: selectedPods.length > 0 ? selectedPods : undefined,
    };

    if (isEditMode) {
      updateOKR.mutate(
        { id: okr.id, data: formData },
        {
          onSuccess: () => {
            handleClose();
          },
        }
      );
    } else {
      createOKR.mutate(formData, {
        onSuccess: () => {
          resetForm();
          handleClose();
        },
      });
    }
  };

  const isPending = isEditMode ? updateOKR.isPending : createOKR.isPending;

  return (
    <Modal isOpen={open} onClose={handleClose} title={isEditMode ? 'Edit OKR' : 'Add OKR'}>
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
        <Select
          label="Time Window"
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value)}
          options={[
            { value: '', label: 'Select time window...' },
            ...generateTimeWindowOptions(),
          ]}
        />

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isCompanyWide}
                  onChange={(e) => setIsCompanyWide(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Company-wide</span>
              </label>
              <div className="ml-6 space-y-2">
                <p className="text-xs text-gray-500 mb-1">Pods:</p>
                {ALL_PODS.map((pod) => (
                  <label key={pod} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPods.includes(pod)}
                      onChange={() => handlePodToggle(pod)}
                      disabled={isCompanyWide}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{pod}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || isPending}>
            {isEditMode
              ? (isPending ? 'Saving...' : 'Save Changes')
              : (isPending ? 'Adding...' : 'Add OKR')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
