import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { initiativeApi } from '../lib/api';
import type { CreateInitiativeInput, UpdateInitiativeInput } from '../types';

export function useInitiatives() {
  return useQuery({
    queryKey: ['initiatives'],
    queryFn: initiativeApi.getAll,
  });
}

export function useScopedInitiatives() {
  return useQuery({
    queryKey: ['initiatives', 'scoped'],
    queryFn: initiativeApi.getScoped,
  });
}

export function useUnscopedInitiatives() {
  return useQuery({
    queryKey: ['initiatives', 'unscoped'],
    queryFn: initiativeApi.getUnscoped,
  });
}

export function useCreateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInitiativeInput) => initiativeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}

export function useUpdateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInitiativeInput }) =>
      initiativeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}

export function useDeleteInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => initiativeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}
