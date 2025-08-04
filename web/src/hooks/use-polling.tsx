import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePollingOptions {
  /** Polling interval in milliseconds (default: 5000) */
  interval?: number;
  /** Whether to start polling immediately (default: true) */
  enabled?: boolean;
  /** Whether to pause polling when tab is not visible (default: true) */
  pauseOnHidden?: boolean;
  /** Delay before starting polling after initial load (default: 5000ms) */
  initialDelay?: number;
  /** Function to call on successful data fetch */
  onSuccess?: (data: unknown) => void;
  /** Function to call on error */
  onError?: (error: Error) => void;
}

/**
 * A custom hook for polling data at regular intervals
 * @param fetchFn - Function that returns a Promise with the data to fetch
 * @param options - Polling configuration options
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions = {}
) {
  const {
    interval = 5000,
    enabled = true,
    pauseOnHidden = true,
    initialDelay = 5000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track document visibility
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    if (pauseOnHidden) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [pauseOnHidden]);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!isMountedRef.current) {
      console.log('🔄 Polling: ❌ Component unmounted before fetchData started');
      return;
    }

    console.log('🔄 Polling: fetchData called', { isInitialLoad });
    try {
      if (isInitialLoad) {
        console.log('🔄 Polling: Setting loading = true for initial load');
        setLoading(true);
      }
      setError(null);

      console.log('🔄 Polling: Making API request...');
      const result = await fetchFn();
      
      console.log('🔄 Polling: API call returned, checking if mounted...', { mounted: isMountedRef.current });
      
      if (!isMountedRef.current) {
        console.log('🔄 Polling: ❌ Component unmounted after API call, skipping state updates');
        return;
      }

      console.log('🔄 Polling: ✅ API request successful', { 
        resultType: typeof result, 
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : 'N/A'
      });
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      console.log('🔄 Polling: API call failed, checking if mounted...', { mounted: isMountedRef.current });
      
      if (!isMountedRef.current) {
        console.log('🔄 Polling: ❌ Component unmounted during error handling');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      console.error('🔄 Polling: ❌ API request failed', { error: err, message: errorMessage });
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      // Always set loading to false for initial loads, regardless of success/failure
      if (isMountedRef.current && isInitialLoad) {
        console.log('🔄 Polling: Setting loading = false after initial fetch');
        setLoading(false);
      } else if (isInitialLoad) {
        console.log('🔄 Polling: ❌ Component unmounted, cannot set loading = false');
      }
    }
  }, [fetchFn]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    
    intervalRef.current = setInterval(() => {
      if (pauseOnHidden && !isVisible) {
        return; // Skip polling when tab is hidden
      }
      fetchData(false);
    }, interval);
  }, [fetchData, interval, pauseOnHidden, isVisible]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const refresh = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    console.log('🔄 Polling: Initial fetch effect triggered', { enabled });
    if (!enabled) {
      console.log('🔄 Polling: ❌ Disabled, skipping initial fetch');
      return;
    }

    console.log('🔄 Polling: ✅ Enabled, starting initial fetch');
    // Initial fetch only
    fetchData(true);
  }, [enabled, fetchData]); // Include fetchData dependency

  // Start polling after initial delay
  useEffect(() => {
    if (!enabled) return;

    // Start polling after initial delay
    const timer = setTimeout(() => {
      if (enabled && (!pauseOnHidden || isVisible)) {
        startPolling();
      }
    }, initialDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, initialDelay, pauseOnHidden, isVisible, startPolling]); // Include all dependencies

  // Handle visibility changes
  useEffect(() => {
    if (!enabled || !pauseOnHidden) return;

    if (isVisible && !isPolling) {
      startPolling();
    } else if (!isVisible && isPolling) {
      stopPolling();
    }
  }, [isVisible, isPolling, enabled, pauseOnHidden, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true; // Ensure it's set to true on mount
    return () => {
      console.log('🔄 Polling: Component unmounting, cleaning up...');
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    data,
    loading,
    error,
    isPolling,
    refresh,
    startPolling,
    stopPolling,
  };
}