import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { projectsService } from '@/lib/projects-service';
import type { ProjectWithItems } from '@/types/projects';

interface AddToProjectProps {
  itemId: number;
  itemName: string;
  itemType: 'item' | 'building' | 'cargo';
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddToProject({ itemId, itemName, itemType, trigger, onSuccess }: AddToProjectProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithItems[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [amount, setAmount] = useState<string>('1');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user projects when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      loadProjects();
    }
  }, [isOpen, user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const userProjects = await projectsService.getUserProjects();
      setProjects(userProjects);
      
      // Auto-select first project if available
      if (userProjects.length > 0) {
        setSelectedProjectId(userProjects[0].id.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProject = async () => {
    if (!selectedProjectId || !amount) return;

    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      
      await projectsService.addItemToProject(parseInt(selectedProjectId), itemId, numAmount, itemType);
      
      // Reset form and close dialog
      setAmount('1');
      setSelectedProjectId('');
      setIsOpen(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to the project detail page
      navigate(`/projects/${selectedProjectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to project');
      console.error('Failed to add item to project:', err);
    } finally {
      setAdding(false);
    }
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Add to Project
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Project</DialogTitle>
          <DialogDescription>
            Add "{itemName}" to one of your projects for planning and tracking.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You don't have any projects yet. Create a project first to add items to it.
            </p>
            <Button onClick={() => setIsOpen(false)} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project-select" className="text-foreground">Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Choose a project" className="text-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{project.name}</span>
                        {project.group_id && (
                          <Badge variant="secondary" className="text-xs">
                            Group
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-input" className="text-foreground">Amount</Label>
              <Input
                id="amount-input"
                type="number"
                min="1"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !adding) {
                    handleAddToProject();
                  }
                }}
                className="text-foreground"
              />
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToProject}
              disabled={!selectedProjectId || !amount || adding}
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Project
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}