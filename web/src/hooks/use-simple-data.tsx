import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { groupsService } from '@/lib/groups-service';
import { projectsService } from '@/lib/projects-service';
import type { UserGroup } from '@/types/groups';
import type { ProjectWithItems } from '@/types/projects';

/**
 * Simplified data fetching hook for debugging
 * This replaces the complex polling logic with simple fetch-on-mount
 */
export function useSimpleGroups() {
  const { user, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<UserGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔥 useSimpleGroups: Effect triggered', { 
      hasUser: !!user, 
      authLoading,
      shouldFetch: !!user && !authLoading 
    });

    if (authLoading) {
      console.log('🔥 useSimpleGroups: Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('🔥 useSimpleGroups: No user, setting loading = false');
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      console.log('🔥 useSimpleGroups: Starting fetch...');
      setLoading(true);
      setError(null);

      try {
        console.log('🔥 useSimpleGroups: Calling API...');
        const result = await groupsService.getUserGroups();
        console.log('🔥 useSimpleGroups: ✅ Success', { count: result.length, data: result });
        setGroups(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch groups';
        console.error('🔥 useSimpleGroups: ❌ Error', err);
        setError(errorMessage);
      } finally {
        console.log('🔥 useSimpleGroups: Setting loading = false');
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user, authLoading]);

  const refresh = async () => {
    if (!user) return;
    
    console.log('🔥 useSimpleGroups: Manual refresh triggered');
    setLoading(true);
    setError(null);

    try {
      const result = await groupsService.getUserGroups();
      setGroups(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch groups';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { data: groups, loading, error, refresh };
}

export function useSimpleProjects() {
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectWithItems[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔥 useSimpleProjects: Effect triggered', { 
      hasUser: !!user, 
      authLoading,
      shouldFetch: !!user && !authLoading 
    });

    if (authLoading) {
      console.log('🔥 useSimpleProjects: Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('🔥 useSimpleProjects: No user, setting loading = false');
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      console.log('🔥 useSimpleProjects: Starting fetch...');
      setLoading(true);
      setError(null);

      try {
        console.log('🔥 useSimpleProjects: Calling API...');
        const result = await projectsService.getUserProjects();
        console.log('🔥 useSimpleProjects: ✅ Success', { count: result.length, data: result });
        setProjects(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
        console.error('🔥 useSimpleProjects: ❌ Error', err);
        setError(errorMessage);
      } finally {
        console.log('🔥 useSimpleProjects: Setting loading = false');
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, authLoading]);

  const refresh = async () => {
    if (!user) return;
    
    console.log('🔥 useSimpleProjects: Manual refresh triggered');
    setLoading(true);
    setError(null);

    try {
      const result = await projectsService.getUserProjects();
      setProjects(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { data: projects, loading, error, refresh };
}