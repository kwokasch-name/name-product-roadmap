export type Pod = 'Retail Therapy' | 'JSON ID';
export type InitiativeStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';

export interface OKR {
  id: number;
  title: string;
  description: string | null;
  timeFrame: string | null;
  keyResults?: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface KeyResult {
  id: number;
  okrId: number;
  title: string;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Initiative {
  id: number;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  developerCount: number;
  okrId: number | null;
  okr?: OKR;
  successCriteria: string | null;
  pod: Pod;
  status: InitiativeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOKRInput {
  title: string;
  description?: string;
  timeFrame?: string;
}

export interface UpdateOKRInput {
  title?: string;
  description?: string;
  timeFrame?: string;
}

export interface CreateKeyResultInput {
  title: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
}

export interface UpdateKeyResultInput {
  title?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
}

export interface CreateInitiativeInput {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  developerCount?: number;
  okrId?: number;
  successCriteria?: string;
  pod: Pod;
  status?: InitiativeStatus;
}

export interface UpdateInitiativeInput {
  title?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  developerCount?: number;
  okrId?: number | null;
  successCriteria?: string;
  pod?: Pod;
  status?: InitiativeStatus;
}
