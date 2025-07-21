import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Users, Package, ExternalLink, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ProtectedRoute } from '@/components/protected-route';
import { authService } from '@/lib/auth-service';
import type { CraftingProject } from '@/types/crafting';

function ProjectCard({ project }: { project: CraftingProject }) {
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [privateLinkCopied, setPrivateLinkCopied] = useState(false);

  const copyToClipboard = async (text: string, type: 'public' | 'private') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'public') {
        setPublicLinkCopied(true);
        setTimeout(() => setPublicLinkCopied(false), 2000);
      } else {
        setPrivateLinkCopied(true);
        setTimeout(() => setPrivateLinkCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const publicUrl = `${window.location.origin}/projects/${project.public_uuid}`;
  const privateUrl = `${window.location.origin}/projects/${project.private_uuid}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{project.project_name}</CardTitle>
            <CardDescription className="mt-1">
              Created {new Date().toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {project.target_items.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{project.target_items.length} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{project.owners.length} collaborator{project.owners.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to={`/projects/${project.private_uuid}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Project
              </Link>
            </Button>
          </div>

          {/* Share links */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(publicUrl, 'public')}
                className="flex-1 text-xs"
              >
                {publicLinkCopied ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {publicLinkCopied ? 'Copied!' : 'Copy View Link'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(privateUrl, 'private')}
                className="flex-1 text-xs"
              >
                {privateLinkCopied ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {privateLinkCopied ? 'Copied!' : 'Copy Edit Link'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share view link for read-only access, edit link for collaboration
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectsContent() {
  const [projects, setProjects] = useState<CraftingProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userProjects = await authService.getUserProjects();
      setProjects(userProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading your projects...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage your Bitcraft crafting projects
            </p>
          </div>
          <Button onClick={() => navigate('/projects/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Projects grid */}
        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No projects yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first crafting project to start planning your Bitcraft builds and track your progress.
              </p>
              <Button onClick={() => navigate('/projects/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.project_id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Projects() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
} 