import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { useCreateOKR } from '../../hooks/useOKRs';
import { useRoadmapContext } from '../../context/RoadmapContext';
import type { Pod } from '../../types';

const ALL_PODS: Pod[] = ['Retail Therapy', 'JSON ID'];

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

export function OKRForm() {
  const { isOKRFormOpen, setIsOKRFormOpen } = useRoadmapContext();
  const createOKR = useCreateOKR();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeFrame, setTimeFrame] = useState('');
  const [isCompanyWide, setIsCompanyWide] = useState(false);
  const [selectedPods, setSelectedPods] = useState<Pod[]>([]);

  const handlePodToggle = (pod: Pod) => {
    setSelectedPods(prev =>
      prev.includes(pod) ? prev.filter(p => p !== pod) : [...prev, pod]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isCompanyWide && selectedPods.length === 0) {
      alert('Please select at least one pod or mark as company-wide');
      return;
    }

    createOKR.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        timeFrame: timeFrame.trim() || undefined,
        isCompanyWide: isCompanyWide,
        pods: selectedPods.length > 0 ? selectedPods : undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setTimeFrame('');
          setIsCompanyWide(false);
          setSelectedPods([]);
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
