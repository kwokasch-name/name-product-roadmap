export type Pod = 'Retail Therapy' | 'JSON ID' | 'Migration';
export type InitiativeStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';

export interface OKR {
  id: string;
  title: string;
  description: string | null;
  timeFrame: string | null;
  isCompanyWide: boolean;
  pods: Pod[];
  keyResults?: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface KeyResult {
  id: string;
  okrId: string;
  title: string;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Initiative {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  developerCount: number;
  okrId: string | null;
  okr?: OKR;
  successCriteria: string | null;
  pod: Pod;
  status: InitiativeStatus;
  jiraEpicKey: string | null;
  jiraSyncEnabled: boolean;
  jiraLastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JiraEpic {
  key: string;
  summary: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  url: string;
}

export interface CreateOKRInput {
  title: string;
  description?: string;
  timeFrame?: string;
  isCompanyWide?: boolean;
  pods?: Pod[];
}

export interface UpdateOKRInput {
  title?: string;
  description?: string;
  timeFrame?: string;
  isCompanyWide?: boolean;
  pods?: Pod[];
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
  okrId?: string;
  successCriteria?: string;
  pod: Pod;
  status?: InitiativeStatus;
  jiraEpicKey?: string;
  jiraSyncEnabled?: boolean;
}

export interface UpdateInitiativeInput {
  title?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  developerCount?: number;
  okrId?: string | null;
  successCriteria?: string;
  pod?: Pod;
  status?: InitiativeStatus;
  jiraEpicKey?: string | null;
  jiraSyncEnabled?: boolean;
}
