import { useCallback } from 'react';
import { usePolling } from './use-polling';
import { projectsService } from '@/lib/projects-service';
import { groupsService } from '@/lib/groups-service';
import type { ProjectWithItems } from '@/types/projects';
import type { UserGroup, GroupWithDetails } from '@/types/groups';

interface UseProjectsPollingOptions {
  /** Polling interval in milliseconds (default: 5000) */
  interval?: number;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Whether to pause polling when tab is not visible (default: true) */
  pauseOnHidden?: boolean;
  /** Delay before starting polling after initial load (default: same as interval) */
  initialDelay?: number;
}

/**
 * Hook for polling user projects with automatic updates
 */
export function useProjectsPolling(options: UseProjectsPollingOptions = {}) {
  const interval = options.interval ?? 5000;
  
  const fetchFn = useCallback(async () => {
    return await projectsService.getUserProjects();
  }, []);

  const onSuccess = useCallback((_data: unknown) => {
    // Success callback - can be used for additional processing if needed
  }, []);

  const onError = useCallback((error: Error) => {
    console.error('Failed to poll projects:', error);
  }, []);

  return usePolling<ProjectWithItems[]>(
    fetchFn,
    {
      interval,
      initialDelay: options.initialDelay ?? interval,
      ...options,
      onSuccess,
      onError
    }
  );
}

/**
 * Hook for polling user groups with automatic updates
 */
export function useGroupsPolling(options: UseProjectsPollingOptions = {}) {
  const interval = options.interval ?? 5000;
  
  const fetchFn = useCallback(async () => {
    return await groupsService.getUserGroups();
  }, []);

  const onSuccess = useCallback((_data: unknown) => {
    // Success callback - can be used for additional processing if needed
  }, []);

  const onError = useCallback((error: Error) => {
    console.error('Failed to poll groups:', error);
  }, []);

  return usePolling<UserGroup[]>(
    fetchFn,
    {
      interval,
      initialDelay: options.initialDelay ?? interval,
      ...options,
      onSuccess,
      onError
    }
  );
}

/**
 * Hook for polling a specific project with automatic updates
 */
export function useProjectPolling(
  projectId: number | null,
  options: UseProjectsPollingOptions = {}
) {
  const interval = options.interval ?? 5000;

  const fetchFn = useCallback(async () => {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    return await projectsService.getProject(projectId);
  }, [projectId]);

  const onError = useCallback((error: Error) => {
    console.error(`Failed to poll project ${projectId}:`, error);
  }, [projectId]);

  return usePolling<ProjectWithItems>(
    fetchFn,
    {
      interval,
      initialDelay: options.initialDelay ?? interval,
      enabled: options.enabled !== false && projectId !== null,
      ...options,
      onError
    }
  );
}

/**
 * Hook for polling a specific group with automatic updates
 */
export function useGroupPolling(
  groupId: number | null,
  options: UseProjectsPollingOptions = {}
) {
  const interval = options.interval ?? 5000;

  const fetchFn = useCallback(async () => {
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    return await groupsService.getGroup(groupId);
  }, [groupId]);

  const onError = useCallback((error: Error) => {
    console.error(`Failed to poll group ${groupId}:`, error);
  }, [groupId]);

  return usePolling<GroupWithDetails>(
    fetchFn,
    {
      interval,
      initialDelay: options.initialDelay ?? interval,
      enabled: options.enabled !== false && groupId !== null,
      ...options,
      onError
    }
  );
}