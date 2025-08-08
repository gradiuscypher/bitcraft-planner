import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { projectsService } from '@/lib/projects-service';
import { useProjectPolling, useGroupPolling } from '@/hooks/use-projects-polling';
import { POLLING_CONFIG } from '@/lib/polling-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Minus
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import type { ProjectWithItems } from '@/types/projects';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const projectIdNum = projectId ? parseInt(projectId) : null;
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({});
  const [isSavingCounts, setIsSavingCounts] = useState(false);
  
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

          {canUserModifyProject(project) && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
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
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Project Items ({project.items?.length || 0})
                </CardTitle>
                <CardDescription>
                  Items to craft for this project
                </CardDescription>
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {project.items.map((item) => {
                      const itemProgress = item.target_count > 0 ? Math.round((item.count / item.target_count) * 100) : 0;
                      const isCompleted = item.count >= item.target_count;
                      
                      return (
                        <div key={item.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <h4 className="font-semibold text-sm truncate">{item.name}</h4>
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
                        </div>
                      );
                    })}
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