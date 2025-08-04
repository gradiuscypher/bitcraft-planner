import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { projectsService } from '@/lib/projects-service';
import { groupsService } from '@/lib/groups-service';
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
import { Plus, FolderOpen, Settings, Trash2, Calendar, Crown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProtectedRoute } from '@/components/protected-route';
import type { ProjectWithItems } from '@/types/projects';
import type { UserGroup } from '@/types/groups';

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithItems[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('personal');
  const [isCreating, setIsCreating] = useState(false);

  // Load projects and groups on component mount
  useEffect(() => {
    loadProjects();
    loadGroups();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const userProjects = await projectsService.getUserProjects();
      setProjects(userProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const userGroups = await groupsService.getUserGroups();
      setGroups(userGroups);
    } catch (err) {
      console.error('Failed to load groups:', err);
      // Don't show error for groups, as it's not critical
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setIsCreating(true);
      await projectsService.createProject({
        name: newProjectName.trim(),
        group_id: selectedGroupId === 'personal' ? null : parseInt(selectedGroupId),
      });
      setNewProjectName('');
      setSelectedGroupId('personal');
      setIsCreateDialogOpen(false);
      await loadProjects(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await projectsService.deleteProject(projectId);
      await loadProjects(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
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

  const isProjectOwner = (project: ProjectWithItems) => {
    return user?.id === project.owner_id;
  };

  const getItemsCount = (project: ProjectWithItems) => {
    return project.items?.length || 0;
  };

  const getProjectGroup = (project: ProjectWithItems) => {
    if (!project.group_id) return null;
    return groups.find(group => group.id === project.group_id);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading projects...</div>
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
                        .filter((group) => group.can_create_projects)
                        .map((group) => (
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

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
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
        ) : (
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
                    
                    {/* Actions for project owners */}
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
                    {/* Project Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant={project.group_id ? "secondary" : "default"}>
                        {project.group_id ? `Group: ${getProjectGroup(project)?.name || 'Unknown'}` : "Personal"}
                      </Badge>
                    </div>

                    {/* Project Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={isProjectOwner(project) ? "default" : "secondary"}>
                        {isProjectOwner(project) ? "Owner" : "Shared"}
                      </Badge>
                    </div>
                    
                    {/* Items Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Items</span>
                      <Badge variant="outline">
                        {getItemsCount(project)} items
                      </Badge>
                    </div>
                    
                    {/* Group Info (if applicable) */}
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
        )}
      </div>
    </ProtectedRoute>
  );
} 