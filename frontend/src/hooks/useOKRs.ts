import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { okrApi } from '../lib/api';
import type { CreateOKRInput } from '../types';

export function useOKRs() {
  return useQuery({
    queryKey: ['okrs'],
    queryFn: okrApi.getAll,
  });
}

export function useCreateOKR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOKRInput) => okrApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
    },
  });
}

export function useUpdateOKR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateOKRInput> }) =>
      okrApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
    },
  });
}

export function useDeleteOKR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => okrApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}
