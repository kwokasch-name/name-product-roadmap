import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Initiative, Pod } from '../types';
import { getDefaultViewRange } from '../lib/dateUtils';

const ALL_PODS: Pod[] = ['Retail Therapy', 'JSON ID', 'Migration'];

interface RoadmapContextValue {
  viewStartDate: Date;
  viewEndDate: Date;
  setViewRange: (start: Date, end: Date) => void;
  editingInitiative: Initiative | null;
  setEditingInitiative: (initiative: Initiative | null) => void;
  isOKRFormOpen: boolean;
  setIsOKRFormOpen: (open: boolean) => void;
  isInitiativeFormOpen: boolean;
  setIsInitiativeFormOpen: (open: boolean) => void;
  selectedOKRIds: Set<string>;
  setSelectedOKRIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  toggleOKRSelection: (id: string) => void;
  selectAllOKRs: (ids: string[]) => void;
  deselectAllOKRs: () => void;
  visiblePods: Set<Pod>;
  togglePodVisibility: (pod: Pod) => void;
}

const RoadmapContext = createContext<RoadmapContextValue | null>(null);

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const defaultRange = getDefaultViewRange();
  const [viewStartDate, setViewStartDate] = useState(defaultRange.start);
  const [viewEndDate, setViewEndDate] = useState(defaultRange.end);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [isOKRFormOpen, setIsOKRFormOpen] = useState(false);
  const [isInitiativeFormOpen, setIsInitiativeFormOpen] = useState(false);
  const [selectedOKRIds, setSelectedOKRIds] = useState<Set<string>>(new Set());
  const [visiblePods, setVisiblePods] = useState<Set<Pod>>(new Set(ALL_PODS));

  const setViewRange = (start: Date, end: Date) => {
    setViewStartDate(start);
    setViewEndDate(end);
  };

  const toggleOKRSelection = (id: string) => {
    setSelectedOKRIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllOKRs = (ids: string[]) => {
    setSelectedOKRIds(new Set(ids));
  };

  const deselectAllOKRs = () => {
    setSelectedOKRIds(new Set());
  };

  const togglePodVisibility = (pod: Pod) => {
    setVisiblePods(prev => {
      const next = new Set(prev);
      if (next.has(pod)) {
        next.delete(pod);
      } else {
        next.add(pod);
      }
      return next;
    });
  };

  return (
    <RoadmapContext.Provider
      value={{
        viewStartDate,
        viewEndDate,
        setViewRange,
        editingInitiative,
        setEditingInitiative,
        isOKRFormOpen,
        setIsOKRFormOpen,
        isInitiativeFormOpen,
        setIsInitiativeFormOpen,
        selectedOKRIds,
        setSelectedOKRIds,
        toggleOKRSelection,
        selectAllOKRs,
        deselectAllOKRs,
        visiblePods,
        togglePodVisibility,
      }}
    >
      {children}
    </RoadmapContext.Provider>
  );
}

export function useRoadmapContext() {
  const context = useContext(RoadmapContext);
  if (!context) {
    throw new Error('useRoadmapContext must be used within a RoadmapProvider');
  }
  return context;
}
