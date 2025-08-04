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
    if (!isMountedRef.current) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const result = await fetchFn();
      
      if (!isMountedRef.current) return;

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      // Always set loading to false for initial loads, regardless of success/failure
      if (isMountedRef.current && isInitialLoad) {
        setLoading(false);
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
    if (!enabled) return;

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