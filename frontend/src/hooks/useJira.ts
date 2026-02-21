import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '../lib/api';

export function useJiraStatus() {
  return useQuery({
    queryKey: ['jira', 'status'],
    queryFn: jiraApi.status,
    staleTime: 5 * 60 * 1000, // re-check every 5 min
  });
}

export function useJiraEpicSearch(query: string) {
  return useQuery({
    queryKey: ['jira', 'search', query],
    queryFn: () => jiraApi.searchEpics(query),
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useSyncJira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jiraApi.sync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}

export function useSyncInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jiraApi.syncOne(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}
