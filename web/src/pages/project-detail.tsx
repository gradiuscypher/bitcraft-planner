import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { projectsService } from '@/lib/projects-service';
import { useProjectPolling, useGroupPolling } from '@/hooks/use-projects-polling';
import { POLLING_CONFIG } from '@/lib/polling-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TierTag } from '@/components/tier-tag';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Package, 
  CheckCircle, 
  Clock, 
  Settings,
  Crown,
  Calendar,
  Users,
  Trash2,
  Plus,
  Minus,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/protected-route';
import type { ProjectWithItems, ProjectItem } from '@/types/projects';
import { ProjectItemIngredients } from '@/components/project-item-ingredients'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const projectIdNum = projectId ? parseInt(projectId) : null;
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({});
  const [isSavingCounts, setIsSavingCounts] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (!projectId) return 'table';
    try {
      const stored = localStorage.getItem(`project:${projectId}:viewMode`);
      return stored === 'cards' || stored === 'table' ? stored : 'table';
    } catch {
      return 'table';
    }
  });
  const [expandedItemIds, setExpandedItemIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<'name' | 'tier' | 'progress'>(() => {
    if (!projectId) return 'name'
    try {
      const v = localStorage.getItem(`project:${projectId}:sortKey`)
      return v === 'tier' || v === 'progress' || v === 'name' ? v : 'name'
    } catch { return 'name' }
  })
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    if (!projectId) return 'asc'
    try {
      const v = localStorage.getItem(`project:${projectId}:sortDir`)
      return v === 'desc' ? 'desc' : 'asc'
    } catch { return 'asc' }
  })
  
  // Use polling hooks for automatic updates
  const { 
    data: project, 
    loading, 
    error,
    refresh: refreshProject
  } = useProjectPolling(projectIdNum, {
    interval: POLLING_CONFIG.PROJECT_DETAIL_INTERVAL,
    initialDelay: POLLING_CONFIG.INITIAL_DELAY,
    enabled: !!user && !authLoading // Only poll when user is authenticated and auth is complete
  });
  
  const { 
    data: group 
  } = useGroupPolling(project?.group_id || null, {
    interval: POLLING_CONFIG.GROUP_DETAIL_INTERVAL,
    initialDelay: POLLING_CONFIG.INITIAL_DELAY,
    enabled: !!user && !authLoading && !!project?.group_id // Only poll when authenticated AND project has a group
  });


  const canUserModifyProject = (project: ProjectWithItems) => {
    if (!user) return false;
    
    // Project owner can always modify
    if (user.id === project.owner_id) {
      return true;
    }
    
    // For group projects, check if user is group owner or co-owner
    if (project.group_id && group) {
      // Check if user is group owner
      if (user.id === group.owner_id) {
        return true;
      }
      
      // Check if user is a co-owner in the group
      const userInGroup = group.users.find(groupUser => groupUser.id === user.id);
      if (userInGroup && userInGroup.role === 'co_owner') {
        return true;
      }
    }
    
    return false;
  };

  const hasPendingChanges = useMemo(() => Object.keys(pendingCounts).length > 0, [pendingCounts]);
  const groupedByTier = useMemo(() => {
    const groups: Record<string, ProjectItem[]> = {};
    const items = project && project.items ? project.items : [];
    for (const item of items) {
      const key = typeof item.tier === 'number' && item.tier > 0 ? `T${item.tier}` : 'Unknown';
      if (!groups[key]) groups[key] = [] as ProjectItem[];
      groups[key].push(item);
    }
    // sort items within a tier by name
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [project?.items, project]);

  const tierSections = useMemo(() => {
    const sections: { key: string; label: string; tier: number | null }[] = [];
    for (let t = 1; t <= 7; t++) {
      const key = `T${t}`;
      if (groupedByTier[key]?.length) sections.push({ key, label: `Tier ${t}`, tier: t });
    }
    if (groupedByTier['Unknown']?.length) sections.push({ key: 'Unknown', label: 'Unknown Tier', tier: null });
    return sections;
  }, [groupedByTier]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const getTierHeaderClasses = (tier?: number | null) => {
    switch (tier) {
      case 1:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      case 2:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
      case 3:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 4:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 5:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 6:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 7:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-muted text-foreground';
    }
  };

  // Persist and restore UI preferences per project
  useEffect(() => {
    if (!projectId) return;
    const prefix = `project:${projectId}`;
    try {
      const hide = localStorage.getItem(`${prefix}:hideCompleted`);
      if (hide !== null) setHideCompleted(hide === '1' || hide === 'true');
      const open = localStorage.getItem(`${prefix}:openSections`);
      if (open) {
        const parsed = JSON.parse(open) as Record<string, boolean>;
        if (parsed && typeof parsed === 'object') {
          setOpenSections(parsed);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const prefix = `project:${projectId}`;
    try {
      localStorage.setItem(`${prefix}:hideCompleted`, hideCompleted ? '1' : '0');
    } catch {}
  }, [projectId, hideCompleted]);

  useEffect(() => {
    if (!projectId) return;
    const prefix = `project:${projectId}`;
    try {
      localStorage.setItem(`${prefix}:openSections`, JSON.stringify(openSections));
    } catch {}
  }, [projectId, openSections]);

  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(`project:${projectId}:viewMode`, viewMode);
    } catch {}
  }, [projectId, viewMode]);

  useEffect(() => {
    if (!projectId) return
    try {
      localStorage.setItem(`project:${projectId}:sortKey`, sortKey)
      localStorage.setItem(`project:${projectId}:sortDir`, sortDir)
    } catch {}
  }, [projectId, sortKey, sortDir])

  // Collapse expanded table rows when collapse-all is triggered
  useEffect(() => {
    setExpandedItemIds(new Set());
  }, [collapseAllSignal]);


  const getCurrentCount = (itemId: number, fallback: number) => {
    return pendingCounts[itemId] ?? fallback;
  };

  const setPendingCount = (itemId: number, nextCount: number, originalCount: number) => {
    const clamped = Math.max(0, nextCount);
    setPendingCounts((prev) => {
      // If value equals original, remove from pending
      if (clamped === originalCount) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: clamped };
    });
  };

  const handleSaveAllCounts = async () => {
    if (!project || !hasPendingChanges) return;
    try {
      setIsSavingCounts(true);
      const updates = Object.entries(pendingCounts).map(([itemIdStr, newCount]) => {
        const itemId = Number(itemIdStr);
        return projectsService.updateProjectItemCount(project.id, itemId, newCount);
      });
      await Promise.all(updates);
      setPendingCounts({});
      await refreshProject();
    } catch (err) {
      console.error('Failed to save count changes:', err);
    } finally {
      setIsSavingCounts(false);
    }
  };

  const isProjectOwner = (project: ProjectWithItems) => {
    return user?.id === project.owner_id;
  };

  const getTotalTargetItems = () => {
    return project?.items?.reduce((sum, item) => sum + item.target_count, 0) || 0;
  };

  const getTotalCompletedItems = () => {
    return project?.items?.reduce((sum, item) => sum + item.count, 0) || 0;
  };

  const getProgressPercentage = () => {
    const total = getTotalTargetItems();
    if (total === 0) return 0;
    return Math.round((getTotalCompletedItems() / total) * 100);
  };

  const getItemProgress = (item: ProjectItem) => {
    if (item.target_count <= 0) return 0
    return Math.round((item.count / item.target_count) * 100)
  }

  const sortedFilteredItems = useMemo(() => {
    const items = (project?.items ?? []).filter((i) => !hideCompleted || i.count < i.target_count)
    const itemsWithProgress = items.map(i => ({ i, name: i.name.toLowerCase(), tier: i.tier ?? 9999, progress: getItemProgress(i) }))
    itemsWithProgress.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === 'tier') {
        cmp = a.tier - b.tier
      } else {
        cmp = a.progress - b.progress
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return itemsWithProgress.map(x => x.i)
  }, [project?.items, hideCompleted, sortKey, sortDir])

  const cycleSort = (key: 'name' | 'tier' | 'progress') => {
    setSortKey(prevKey => {
      if (prevKey !== key) {
        setSortDir('asc')
        return key
      }
      setSortDir(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
      return prevKey
    })
  }

  const handleDeleteProject = async () => {
    if (!project) return;
    
    try {
      await projectsService.deleteProject(project.id);
      navigate('/projects'); // Navigate back to projects list after deletion
    } catch (err) {
      console.error('Failed to delete project:', err);
      // Error will be handled by the polling hook's error state
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!project) return;
    
    try {
      await projectsService.removeItemFromProject(project.id, itemId);
      refreshProject(); // Refresh to get updated data
    } catch (err) {
      console.error('Failed to remove item from project:', err);
    }
  };

  // Replaced by batched save: handleSaveAllCounts

  // Show loading spinner only during initial load
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }


  if (error || !project) {
    return (
      <div className="container mx-auto py-8 px-6">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error || 'Project not found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/projects')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                {project.name}
                {isProjectOwner(project) && (
                  <span title="You own this project">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Project #{project.id}
                {project.group_id && (
                  <>
                    <span>•</span>
                    <Users className="h-4 w-4" />
                    Group #{project.group_id}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'table')}>
              <TabsList>
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>
            {canUserModifyProject(project) && (
              <>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Project Settings
                </Button>
                {hasPendingChanges && (
                  <Button 
                    onClick={handleSaveAllCounts}
                    disabled={isSavingCounts}
                    className="flex items-center gap-2"
                  >
                    {isSavingCounts ? 'Saving…' : 'Save Changes'}
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete Project
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{project.name}"? This action cannot be undone.
                        All project items will be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProject}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Project
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Crafting Progress
                </CardTitle>
                <CardDescription>
                  Track your progress on this project's items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {getTotalCompletedItems()}
                    </div>
                    <div className="text-sm text-muted-foreground">Items Crafted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {getTotalTargetItems() - getTotalCompletedItems()}
                    </div>
                    <div className="text-sm text-muted-foreground">Items Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {getTotalTargetItems()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Target Items</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items List */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Project Items ({project.items?.length || 0})
                    </CardTitle>
                    <CardDescription>
                      Items to craft for this project
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={hideCompleted ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setHideCompleted(v => !v)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      {hideCompleted ? 'Showing Incomplete' : 'Hide Completed'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCollapseAllSignal((n) => n + 1)}
                    >
                      Collapse all
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!project.items || project.items.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Items Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add items to this project to start tracking your crafting progress
                    </p>
                    {canUserModifyProject(project) && (
                      <Button onClick={() => navigate('/search/advanced')}>Add Items</Button>
                    )}
                  </div>
                ) : viewMode === 'cards' ? (
                  <div className="space-y-3">
                    {tierSections.map(({ key, label, tier }) => {
                      const itemsInTier = groupedByTier[key] || [];
                      const visibleItems = itemsInTier.filter((item) => !hideCompleted || item.count < item.target_count);
                      if (visibleItems.length === 0) return null;
                      const isOpen = openSections[key] ?? true;
                      return (
                        <div key={key} className="border rounded-lg">
                          <button
                            type="button"
                            className={`w-full flex items-center justify-between px-3 py-2 ${getTierHeaderClasses(typeof tier === 'number' ? tier : null)} transition-colors`}
                            onClick={() => toggleSection(key)}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                              <span className="font-medium text-sm text-foreground">{label}</span>
                              <Badge variant="secondary" className="text-xs">{visibleItems.length}</Badge>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="p-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {visibleItems.map((item) => {
                      const itemProgress = item.target_count > 0 ? Math.round((item.count / item.target_count) * 100) : 0;
                      const isCompleted = item.count >= item.target_count;
                      
                      return (
                        <div key={`item-${project.id}-${item.item_id}`} className={`border rounded-lg p-3 space-y-2`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <h4 className="font-semibold text-sm truncate flex items-center gap-2">
                                  <span className="truncate">{item.name}</span>
                                  <TierTag tier={item.tier ?? null} />
                                </h4>
                                {isCompleted ? (
                                  <Badge variant="default" className="bg-green-500 text-xs px-1 py-0 h-5">
                                    <CheckCircle className="h-2.5 w-2.5" />
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                                    <Clock className="h-2.5 w-2.5" />
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {getCurrentCount(item.item_id, item.count)} / {item.target_count}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <div className="text-xs font-medium text-muted-foreground">
                                {itemProgress}%
                              </div>
                              {canUserModifyProject(project) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-6 w-6 p-0">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Item</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove "{item.name}" from this project?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemoveItem(item.item_id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove Item
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                          
                          <Progress value={itemProgress} className="h-1" />
                          
                          {/* Count Management Controls */}
                          {canUserModifyProject(project) && (
                            <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const current = getCurrentCount(item.item_id, item.count);
                                setPendingCount(item.item_id, Math.max(0, current - 1), item.count);
                              }}
                              disabled={getCurrentCount(item.item_id, item.count) <= 0}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={item.target_count}
                              value={getCurrentCount(item.item_id, item.count)}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = Number(val);
                                if (Number.isNaN(parsed)) {
                                  setPendingCount(item.item_id, 0, item.count);
                                } else {
                                  const clamped = Math.min(Math.max(0, parsed), item.target_count);
                                  setPendingCount(item.item_id, clamped, item.count);
                                }
                              }}
                              className="h-6 w-16 px-2 text-center text-xs"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const current = getCurrentCount(item.item_id, item.count);
                                setPendingCount(
                                  item.item_id,
                                  Math.min(item.target_count, current + 1),
                                  item.count
                                );
                              }}
                              disabled={getCurrentCount(item.item_id, item.count) >= item.target_count}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.target_count - getCurrentCount(item.item_id, item.count)} left
                          </div>
                            </div>
                          )}

                          {/* Ingredients expander */}
                          <ProjectItemIngredients
                            itemId={item.item_id}
                            itemName={item.name}
                            collapseAllSignal={collapseAllSignal}
                            persistKey={`${project.id}:${item.item_id}`}
                          />
                        </div>
                      );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>
                            <button type="button" className="inline-flex items-center gap-1" onClick={() => cycleSort('name')}>
                              Name
                              {sortKey !== 'name' ? (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                              ) : sortDir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="inline-flex items-center gap-1" onClick={() => cycleSort('tier')}>
                              Tier
                              {sortKey !== 'tier' ? (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                              ) : sortDir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="text-right">
                            <button type="button" className="inline-flex items-center gap-1" onClick={() => cycleSort('progress')}>
                              Progress
                              {sortKey !== 'progress' ? (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                              ) : sortDir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          {canUserModifyProject(project) && (
                            <TableHead className="text-right">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedFilteredItems.map((item) => {
                          const itemProgress = item.target_count > 0 ? Math.round((item.count / item.target_count) * 100) : 0;
                          const expanded = expandedItemIds.has(item.item_id);
                          const colSpan = canUserModifyProject(project) ? 6 : 5;
                          return (
                            <>
                              <TableRow key={`row-${project.id}-${item.item_id}`}>
                                <TableCell className="w-8">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setExpandedItemIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(item.item_id)) next.delete(item.item_id); else next.add(item.item_id);
                                        return next;
                                      });
                                    }}
                                    aria-label={expanded ? 'Collapse' : 'Expand'}
                                  >
                                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </Button>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell>
                                  <TierTag tier={item.tier ?? null} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm text-muted-foreground">{itemProgress}%</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm text-foreground">{getCurrentCount(item.item_id, item.count)} / {item.target_count}</span>
                                </TableCell>
                                {canUserModifyProject(project) && (
                                  <TableCell className="text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const current = getCurrentCount(item.item_id, item.count);
                                          setPendingCount(item.item_id, Math.max(0, current - 1), item.count);
                                        }}
                                        disabled={getCurrentCount(item.item_id, item.count) <= 0}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        max={item.target_count}
                                        value={getCurrentCount(item.item_id, item.count)}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const parsed = Number(val);
                                          if (Number.isNaN(parsed)) {
                                            setPendingCount(item.item_id, 0, item.count);
                                          } else {
                                            const clamped = Math.min(Math.max(0, parsed), item.target_count);
                                            setPendingCount(item.item_id, clamped, item.count);
                                          }
                                        }}
                                        className="h-7 w-20 px-2 text-center text-xs"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const current = getCurrentCount(item.item_id, item.count);
                                          setPendingCount(
                                            item.item_id,
                                            Math.min(item.target_count, current + 1),
                                            item.count
                                          );
                                        }}
                                        disabled={getCurrentCount(item.item_id, item.count) >= item.target_count}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 w-7 p-0">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Item</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove "{item.name}" from this project?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveItem(item.item_id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove Item
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                              {expanded && (
                                <TableRow>
                                  <TableCell colSpan={colSpan} className="bg-muted p-0">
                                    <div className="p-3">
                                      <ProjectItemIngredients
                                        itemId={item.item_id}
                                        itemName={item.name}
                                        collapseAllSignal={collapseAllSignal}
                                        persistKey={`${project.id}:${item.item_id}`}
                                        forceOpen
                                        hideToggle
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                      <TableCaption>Adjust counts inline or remove items. Cards/Table choice is saved for this project.</TableCaption>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 