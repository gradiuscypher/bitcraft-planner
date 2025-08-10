import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { projectsService } from '@/lib/projects-service';
import { useProjectsPolling, useGroupsPolling } from '@/hooks/use-projects-polling';
import { POLLING_CONFIG } from '@/lib/polling-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus, FolderOpen, Settings, Trash2, Calendar, Crown, ChevronRight, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProtectedRoute } from '@/components/protected-route';
import type { ProjectWithItems } from '@/types/projects';
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

export function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Use polling hooks for automatic updates
  const { 
    data: projects, 
    loading, 
    error, 
    refresh: refreshProjects 
  } = useProjectsPolling({
    interval: POLLING_CONFIG.PROJECTS_INTERVAL,
    initialDelay: POLLING_CONFIG.INITIAL_DELAY,
    enabled: !!user && !authLoading // Only poll when user is authenticated and auth is complete
  });
  
  const { 
    data: groups 
  } = useGroupsPolling({
    interval: POLLING_CONFIG.GROUPS_INTERVAL,
    initialDelay: POLLING_CONFIG.INITIAL_DELAY,
    enabled: !!user && !authLoading // Only poll when user is authenticated and auth is complete
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('personal');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('projectsViewMode') : null;
    return stored === 'table' || stored === 'cards' ? stored : 'table';
  });
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      window.localStorage.setItem('projectsViewMode', viewMode);
    } catch {
      // ignore storage errors
    }
  }, [viewMode]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setIsCreating(true);
      setCreateError(null);
      await projectsService.createProject({
        name: newProjectName.trim(),
        group_id: selectedGroupId === 'personal' ? null : parseInt(selectedGroupId),
      });
      setNewProjectName('');
      setSelectedGroupId('personal');
      setIsCreateDialogOpen(false);
      refreshProjects(); // Refresh the list immediately
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await projectsService.deleteProject(projectId);
      refreshProjects(); // Refresh the list immediately
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to delete project');
      console.error('Failed to delete project:', err);
    }
  };

  const handleCardClick = (projectId: number, event: React.MouseEvent) => {
    // Prevent navigation when clicking on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/projects/${projectId}`);
  };

  const handleRowClick = (projectId: number, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button') || (event.target as HTMLElement).closest('[data-no-nav]')) {
      return;
    }
    navigate(`/projects/${projectId}`);
  };

  const toggleExpand = (projectId: number) => {
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const isProjectOwner = (project: ProjectWithItems) => {
    return user?.id === project.owner_id;
  };

  const getItemsCount = (project: ProjectWithItems) => {
    return project.items?.length || 0;
  };

  const getProjectGroup = (project: ProjectWithItems) => {
    if (!project.group_id || !groups) return null;
    return groups.find(group => group.id === project.group_id);
  };


  // Show loading spinner only during initial load when we have no data and no error
  if (loading && !projects && !error) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading projects...</div>
        </div>
      </div>
    );
  }

  // Handle general errors (ProtectedRoute handles auth)
  if (error && !loading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive mb-4">Error loading projects: {error}</div>
            <Button onClick={refreshProjects} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-8 w-8 text-primary" />
              Projects
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your Bitcraft projects and plan your builds
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'table')}>
              <TabsList>
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Create Project Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project to organize your Bitcraft builds and planning.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      placeholder="Enter project name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isCreating) {
                          handleCreateProject();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="project-group">Project Type</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal Project</SelectItem>
                        {groups
                          ?.filter((group) => group.can_create_projects)
                          ?.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              Group: {group.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={refreshProjects}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Create Error Display */}
        {createError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
            <p className="font-medium text-destructive">Create Error</p>
            <p className="text-sm">{createError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setCreateError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Projects Listing */}
        {!projects || projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <CardTitle>No Projects Yet</CardTitle>
              <CardDescription>
                Create your first project to start planning your Bitcraft builds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={(e) => handleCardClick(project.id, e)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {project.name}
                        {isProjectOwner(project) && (
                          <span title="You own this project">
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Project #{project.id}
                      </CardDescription>
                    </div>
                    
                    {isProjectOwner(project) && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
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
                                onClick={() => handleDeleteProject(project.id)}
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
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant={project.group_id ? "secondary" : "default"}>
                        {project.group_id ? `Group: ${getProjectGroup(project)?.name || 'Unknown'}` : "Personal"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={isProjectOwner(project) ? "default" : "secondary"}>
                        {isProjectOwner(project) ? "Owner" : "Shared"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Items</span>
                      <Badge variant="outline">
                        {getItemsCount(project)} items
                      </Badge>
                    </div>
                    
                    {project.group_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Group</span>
                        <Badge variant="secondary">
                          Group #{project.group_id}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const expanded = expandedProjectIds.has(project.id);
                  return (
                    <>
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-accent/60 data-[state=selected]:bg-accent text-foreground"
                        onClick={(e) => handleRowClick(project.id, e)}
                      >
                        <TableCell className="w-8">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleExpand(project.id); }} aria-label={expanded ? 'Collapse' : 'Expand'}>
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                          {project.name}
                          {isProjectOwner(project) && (
                            <span title="You own this project" data-no-nav>
                              <Crown className="h-4 w-4 text-yellow-500" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={project.group_id ? 'secondary' : 'default'}>
                            {project.group_id ? `Group: ${getProjectGroup(project)?.name || 'Unknown'}` : 'Personal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isProjectOwner(project) ? 'default' : 'secondary'}>
                            {isProjectOwner(project) ? 'Owner' : 'Shared'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{getItemsCount(project)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isProjectOwner(project) && (
                            <div className="flex items-center gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <Settings className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
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
                                      onClick={() => handleDeleteProject(project.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Project
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow data-no-nav>
                          <TableCell colSpan={6} className="bg-muted text-foreground">
                            <div className="py-3 px-2 text-sm flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="">Project #{project.id}</span>
                                {project.group_id && (
                                  <Badge variant="secondary">Group #{project.group_id}</Badge>
                                )}
                              </div>
                              <div>
                                <span className="">Items:</span>{' '}
                                {project.items && project.items.length > 0 ? (
                                  <span>
                                    {project.items.slice(0, 6).map((it, idx) => (
                                      <span key={it.id} className="mr-2">
                                        <Badge variant="outline">{it.name} × {it.count}</Badge>
                                        {idx < Math.min(project.items!.length, 6) - 1 ? ' ' : ''}
                                      </span>
                                    ))}
                                    {project.items.length > 6 && (
                                      <span className="ml-2">+{project.items.length - 6} more</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="">No items yet</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
              <TableCaption>Click a row to open a project. Use the chevron to expand details.</TableCaption>
            </Table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 