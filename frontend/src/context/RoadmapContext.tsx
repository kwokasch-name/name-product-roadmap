import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Initiative } from '../types';
import { getDefaultViewRange } from '../lib/dateUtils';

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
  selectedOKRIds: Set<number>;
  setSelectedOKRIds: (ids: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  toggleOKRSelection: (id: number) => void;
  selectAllOKRs: (ids: number[]) => void;
  deselectAllOKRs: () => void;
}

const RoadmapContext = createContext<RoadmapContextValue | null>(null);

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const defaultRange = getDefaultViewRange();
  const [viewStartDate, setViewStartDate] = useState(defaultRange.start);
  const [viewEndDate, setViewEndDate] = useState(defaultRange.end);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [isOKRFormOpen, setIsOKRFormOpen] = useState(false);
  const [isInitiativeFormOpen, setIsInitiativeFormOpen] = useState(false);
  const [selectedOKRIds, setSelectedOKRIds] = useState<Set<number>>(new Set());

  const setViewRange = (start: Date, end: Date) => {
    setViewStartDate(start);
    setViewEndDate(end);
  };

  const toggleOKRSelection = (id: number) => {
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

  const selectAllOKRs = (ids: number[]) => {
    setSelectedOKRIds(new Set(ids));
  };

  const deselectAllOKRs = () => {
    setSelectedOKRIds(new Set());
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
