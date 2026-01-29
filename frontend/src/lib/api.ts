import type { OKR, Initiative, CreateOKRInput, CreateInitiativeInput, UpdateInitiativeInput } from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If response is not JSON, use the status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// OKR API
export const okrApi = {
  getAll: () => fetchJson<OKR[]>(`${BASE_URL}/okrs`),
  getById: (id: number) => fetchJson<OKR>(`${BASE_URL}/okrs/${id}`),
  create: (data: CreateOKRInput) => fetchJson<OKR>(`${BASE_URL}/okrs`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<CreateOKRInput>) => fetchJson<OKR>(`${BASE_URL}/okrs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchJson<void>(`${BASE_URL}/okrs/${id}`, {
    method: 'DELETE',
  }),
};

// Initiative API
export const initiativeApi = {
  getAll: () => fetchJson<Initiative[]>(`${BASE_URL}/initiatives`),
  getScoped: () => fetchJson<Initiative[]>(`${BASE_URL}/initiatives/scoped`),
  getUnscoped: () => fetchJson<Initiative[]>(`${BASE_URL}/initiatives/unscoped`),
  getById: (id: number) => fetchJson<Initiative>(`${BASE_URL}/initiatives/${id}`),
  create: (data: CreateInitiativeInput) => fetchJson<Initiative>(`${BASE_URL}/initiatives`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: UpdateInitiativeInput) => fetchJson<Initiative>(`${BASE_URL}/initiatives/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchJson<void>(`${BASE_URL}/initiatives/${id}`, {
    method: 'DELETE',
  }),
};
