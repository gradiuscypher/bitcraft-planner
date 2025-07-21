import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Hammer, Plus } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from '@/components/protected-route';
import { authService } from '@/lib/auth-service';
import type { CreateProjectRequest } from '@/types/crafting';

function CreateProjectContent() {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);

    try {
      const request: CreateProjectRequest = {
        project_name: projectName.trim(),
      };

      const response = await authService.createProject(request);
      
      // Navigate to the newly created project using its private UUID for editing
      navigate(`/projects/${response.private_uuid}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hammer className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create New Project</CardTitle>
          <CardDescription>
            Start planning your Bitcraft crafting project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                type="text"
                placeholder="Enter your project name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isLoading}
                className="w-full"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                Choose a descriptive name for your crafting project
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/projects')}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !projectName.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Add items and their quantities to your project</li>
              <li>• Share the project with collaborators</li>
              <li>• Track progress as you craft items</li>
              <li>• View required resources and recipes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CreateProject() {
  return (
    <ProtectedRoute>
      <CreateProjectContent />
    </ProtectedRoute>
  );
} 