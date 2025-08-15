import { useState, useEffect } from 'react';
import { Package, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authService } from '@/lib/auth-service';
import { API_BASE_URL } from '@/lib/config';
import { useNavigate } from 'react-router-dom';

interface RawMaterial {
  item_id: number;
  item_name: string;
  amount: number;
  is_base_material: boolean;
}

interface ProjectRawMaterialsResponse {
  project_id: number;
  project_name: string;
  base_materials: RawMaterial[];
}

interface CachedRawMaterials {
  data: ProjectRawMaterialsResponse;
  timestamp: number;
}

interface ProjectRawMaterialsProps {
  projectId: number;
  refreshTrigger?: number; // Optional prop to trigger refresh
}

// Cache duration: 1 day in milliseconds
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Cache utility functions
const getCacheKey = (projectId: number) => `raw-materials-${projectId}`;
const getLastRefreshTriggerKey = (projectId: number) => `raw-materials-refresh-${projectId}`;

const getCachedData = (projectId: number): ProjectRawMaterialsResponse | null => {
  try {
    const cacheKey = getCacheKey(projectId);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { data, timestamp }: CachedRawMaterials = JSON.parse(cached);
    const now = Date.now();
    const isExpired = now - timestamp >= CACHE_DURATION;
    
    // Check if cache is still valid (within 1 day)
    if (!isExpired) {
      return data;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch {
    // If there's any error parsing cache, remove it
    localStorage.removeItem(getCacheKey(projectId));
    return null;
  }
};

const setCachedData = (projectId: number, data: ProjectRawMaterialsResponse): void => {
  try {
    const cacheKey = getCacheKey(projectId);
    const cacheEntry: CachedRawMaterials = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch {
    // If localStorage is full or unavailable, silently fail
    console.warn('Failed to cache raw materials data');
  }
};

const getLastRefreshTrigger = (projectId: number): number | undefined => {
  try {
    const stored = localStorage.getItem(getLastRefreshTriggerKey(projectId));
    return stored ? parseInt(stored, 10) : undefined;
  } catch {
    return undefined;
  }
};

const setLastRefreshTrigger = (projectId: number, value: number | undefined): void => {
  try {
    const key = getLastRefreshTriggerKey(projectId);
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value.toString());
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

const invalidateCache = (projectId: number): void => {
  try {
    localStorage.removeItem(getCacheKey(projectId));
    // Also reset the refresh trigger when invalidating cache
    localStorage.removeItem(getLastRefreshTriggerKey(projectId));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

// Export cache invalidation function for external use
export const invalidateRawMaterialsCache = (projectId: number): void => {
  invalidateCache(projectId);
};

export function ProjectRawMaterials({ projectId, refreshTrigger }: ProjectRawMaterialsProps) {
  const [data, setData] = useState<ProjectRawMaterialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        setFromCache(false);
        
        // Only skip cache if refreshTrigger has actually changed from the last time
        // This allows caching to work on initial load and tab switches
        // but forces fresh fetch when data changes (refreshTrigger incremented)
        const lastRefreshTrigger = getLastRefreshTrigger(projectId);
        const refreshTriggerChanged = refreshTrigger !== lastRefreshTrigger;
        const shouldSkipCache = refreshTriggerChanged && refreshTrigger !== undefined && refreshTrigger > 0;
        
        // Check cache first (unless we're forcing a refresh)
        if (!shouldSkipCache) {
          const cachedData = getCachedData(projectId);
          if (cachedData) {
            setData(cachedData);
            setFromCache(true);
            setLoading(false);
            // Update last refresh trigger even when loading from cache
            setLastRefreshTrigger(projectId, refreshTrigger);
            return;
          }
        }
        
        const token = authService.getStoredToken();
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/raw-materials`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          let errorMessage = 'Failed to load raw materials';
          
          // Try to get error details from response
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            // If we can't parse as JSON, use status-based messages
            if (response.status === 404) {
              errorMessage = 'Project not found';
            } else if (response.status === 403) {
              errorMessage = 'You do not have access to this project';
            } else if (response.status === 401) {
              errorMessage = 'Authentication required';
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // Cache the fresh data
        setCachedData(projectId, result);
        setData(result);
        
        // Update the last refresh trigger value so we don't force refresh again until it changes
        if (refreshTriggerChanged) {
          setLastRefreshTrigger(projectId, refreshTrigger);
        }
      } catch (err) {
        console.error('Failed to fetch raw materials:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRawMaterials();
  }, [projectId, refreshTrigger]);

  const handleItemClick = (itemId: number) => {
    navigate(`/item/${itemId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculating raw materials...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.base_materials.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Raw Materials</h3>
        <p className="text-muted-foreground">
          This project doesn't require any base materials, or all items are already base materials.
        </p>
      </div>
    );
  }

  const totalMaterials = data.base_materials.length;
  const totalAmount = data.base_materials.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Raw Materials Summary
            {fromCache && (
              <Badge variant="outline" className="text-[10px] h-5">
                Cached
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Base materials needed for remaining project items
            {fromCache && (
              <span className="text-xs text-muted-foreground ml-2">
                • Data cached for faster loading
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{totalMaterials}</div>
              <div className="text-sm text-muted-foreground">Unique Materials</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{totalAmount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Remaining Needed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{data.project_name}</div>
              <div className="text-sm text-muted-foreground">Project</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.base_materials.map((material) => (
          <Card 
            key={material.item_id} 
            className="p-3 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => handleItemClick(material.item_id)}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate flex items-center gap-1">
                    <span className="truncate">{material.item_name}</span>
                  </h4>
                </div>
                <Badge variant="secondary" className="text-xs h-5 ml-2">
                  {material.amount.toLocaleString()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Base Material</span>
                <span>Item ID: {material.item_id}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center pt-4">
        Raw materials calculation is based on remaining items needed (target - completed). 
        Materials are automatically calculated from available crafting recipes.
        <br />
        Click any material card to view item details. Data is cached for 24 hours for faster loading.
      </div>
    </div>
  );
}
