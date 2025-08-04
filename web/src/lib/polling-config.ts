/**
 * Configuration for polling intervals across the application
 * All intervals are in milliseconds
 */
export const POLLING_CONFIG = {
  /** Default polling interval for most data (5 seconds) */
  DEFAULT_INTERVAL: 5000,
  
  /** Projects polling interval */
  PROJECTS_INTERVAL: 5000,
  
  /** Groups polling interval */
  GROUPS_INTERVAL: 5000,
  
  /** Individual project details polling interval */
  PROJECT_DETAIL_INTERVAL: 5000,
  
  /** Individual group details polling interval */
  GROUP_DETAIL_INTERVAL: 5000,
  
  /** Initial delay before starting polling (default: same as interval) */
  INITIAL_DELAY: 5000,
  
  /** Whether polling is enabled by default */
  ENABLED_BY_DEFAULT: true,
  
  /** Whether to pause polling when tab is not visible */
  PAUSE_ON_HIDDEN: true,
} as const;

/**
 * Get polling options with defaults from config
 */
export function getPollingOptions(overrides: {
  interval?: number;
  initialDelay?: number;
  enabled?: boolean;
  pauseOnHidden?: boolean;
} = {}) {
  return {
    interval: overrides.interval ?? POLLING_CONFIG.DEFAULT_INTERVAL,
    initialDelay: overrides.initialDelay ?? POLLING_CONFIG.INITIAL_DELAY,
    enabled: overrides.enabled ?? POLLING_CONFIG.ENABLED_BY_DEFAULT,
    pauseOnHidden: overrides.pauseOnHidden ?? POLLING_CONFIG.PAUSE_ON_HIDDEN,
  };
}