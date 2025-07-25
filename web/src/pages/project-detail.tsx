import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { projectsService } from '@/lib/projects-service';
import { Button } from '@/components/ui/button';
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
  Trash2
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import type { ProjectWithItems } from '@/types/projects';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject(parseInt(projectId));
    }
  }, [projectId]);

  const loadProject = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const projectData = await projectsService.getProject(id);
      setProject(projectData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  const isProjectOwner = (project: ProjectWithItems) => {
    return user?.id === project.owner_id;
  };

  const getTotalItems = () => {
    return project?.items?.reduce((sum, item) => sum + item.count, 0) || 0;
  };

  const getCompletedItems = () => {
    // For now, we'll show mock progress. In a real app, you'd track actual progress
    return Math.floor(getTotalItems() * 0.3); // 30% completed as placeholder
  };

  const getProgressPercentage = () => {
    const total = getTotalItems();
    if (total === 0) return 0;
    return Math.round((getCompletedItems() / total) * 100);
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    
    try {
      await projectsService.deleteProject(project.id);
      navigate('/projects'); // Navigate back to projects list after deletion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      console.error('Failed to delete project:', err);
    }
  };

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

          {isProjectOwner(project) && (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Project Settings
              </Button>
              
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
                      {getCompletedItems()}
                    </div>
                    <div className="text-sm text-muted-foreground">Items Crafted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {getTotalItems() - getCompletedItems()}
                    </div>
                    <div className="text-sm text-muted-foreground">Items Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {getTotalItems()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
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
                    {isProjectOwner(project) && (
                      <Button>Add Items</Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.items.map((item) => {
                      // Mock progress for individual items (in real app, this would come from data)
                      const itemCompleted = Math.floor(item.count * (0.2 + Math.random() * 0.6));
                      const itemProgress = Math.round((itemCompleted / item.count) * 100);
                      const isCompleted = itemCompleted >= item.count;
                      
                      return (
                        <div key={item.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{item.name}</h4>
                                {isCompleted ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Complete
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    In Progress
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {itemCompleted} of {item.count} crafted
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {itemProgress}%
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Progress value={itemProgress} className="h-1.5" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{item.count - itemCompleted} remaining</span>
                            </div>
                          </div>
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