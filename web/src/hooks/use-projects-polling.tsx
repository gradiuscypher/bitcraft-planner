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
  console.log('🚀 useProjectsPolling: Initializing', { 
    enabled: options.enabled, 
    interval, 
    initialDelay: options.initialDelay ?? interval 
  });
  
  const fetchFn = useCallback(async () => {
    console.log('🚀 useProjectsPolling: Calling projectsService.getUserProjects()');
    const result = await projectsService.getUserProjects();
    console.log('🚀 useProjectsPolling: Service call complete');
    return result;
  }, []);

  const onSuccess = useCallback((data: ProjectWithItems[]) => {
    console.log('🚀 useProjectsPolling: ✅ Success', { count: Array.isArray(data) ? data.length : 0, data });
  }, []);

  const onError = useCallback((error: Error) => {
    console.error('🚀 useProjectsPolling: ❌ Error', error);
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
  console.log('👥 useGroupsPolling: Initializing', { 
    enabled: options.enabled, 
    interval, 
    initialDelay: options.initialDelay ?? interval 
  });
  
  const fetchFn = useCallback(async () => {
    console.log('👥 useGroupsPolling: Calling groupsService.getUserGroups()');
    const result = await groupsService.getUserGroups();
    console.log('👥 useGroupsPolling: Service call complete');
    return result;
  }, []);

  const onSuccess = useCallback((data: UserGroup[]) => {
    console.log('👥 useGroupsPolling: ✅ Success', { count: Array.isArray(data) ? data.length : 0, data });
  }, []);

  const onError = useCallback((error: Error) => {
    console.error('👥 useGroupsPolling: ❌ Error', error);
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
  
  console.log('📋 useProjectPolling: Initializing', { 
    projectId, 
    enabled: options.enabled, 
    hasProjectId: !!projectId,
    shouldEnable: options.enabled !== false && projectId !== null 
  });

  const fetchFn = useCallback(async () => {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    console.log('📋 useProjectPolling: Calling projectsService.getProject for ID:', projectId);
    const result = await projectsService.getProject(projectId);
    console.log('📋 useProjectPolling: Service call complete');
    return result;
  }, [projectId]);

  const onError = useCallback((error: Error) => {
    console.error(`📋 useProjectPolling: ❌ Error for project ${projectId}:`, error);
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
  
  console.log('🏗️ useGroupPolling: Initializing', { 
    groupId, 
    enabled: options.enabled, 
    hasGroupId: !!groupId,
    shouldEnable: options.enabled !== false && groupId !== null 
  });

  const fetchFn = useCallback(async () => {
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    console.log('🏗️ useGroupPolling: Calling groupsService.getGroup for ID:', groupId);
    const result = await groupsService.getGroup(groupId);
    console.log('🏗️ useGroupPolling: Service call complete');
    return result;
  }, [groupId]);

  const onError = useCallback((error: Error) => {
    console.error(`🏗️ useGroupPolling: ❌ Error for group ${groupId}:`, error);
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