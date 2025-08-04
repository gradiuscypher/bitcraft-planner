import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useSimpleGroups } from '@/hooks/use-simple-data';
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
import { Plus, Users, Settings, Trash2, UserPlus, UserMinus, Calendar, Crown } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import type { UserGroup } from '@/types/groups';

export function GroupsPageSimple() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  console.log('🔥 GroupsPageSimple: Render', { hasUser: !!user, userEmail: user?.email });

  // Use simplified data fetching
  const { 
    data: groups, 
    loading, 
    error, 
    refresh: refreshGroups 
  } = useSimpleGroups();

  console.log('🔥 GroupsPageSimple: Data state', { 
    loading, 
    hasData: !!groups, 
    dataLength: Array.isArray(groups) ? groups.length : 'not array',
    error 
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      setIsCreating(true);
      setCreateError(null);
      console.log('🔥 GroupsPageSimple: Creating group:', newGroupName);
      await groupsService.createGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreateDialogOpen(false);
      refreshGroups(); // Refresh the list immediately
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create group');
      console.error('🔥 GroupsPageSimple: Create failed:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      console.log('🔥 GroupsPageSimple: Deleting group:', groupId);
      await groupsService.deleteGroup(groupId);
      refreshGroups(); // Refresh the list immediately
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to delete group');
      console.error('🔥 GroupsPageSimple: Delete failed:', err);
    }
  };

  const handleCardClick = (groupId: number, event: React.MouseEvent) => {
    // Prevent navigation when clicking on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/groups/${groupId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isGroupOwner = (group: UserGroup) => {
    return user?.id === group.owner_id;
  };

  // Show loading only when we have no data and no error
  if (loading && !groups && !error) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading groups...</div>
        </div>
      </div>
    );
  }

  // Handle errors
  if (error && !loading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive mb-4">Error loading groups: {error}</div>
            <Button onClick={refreshGroups} variant="outline">
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
              <Users className="h-8 w-8 text-primary" />
              Player Groups (Simple)
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage groups for collaborative planning
            </p>
          </div>

          {/* Create Group Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new group to collaborate with other players on your bitcraft projects.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    placeholder="Enter group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreating) {
                        handleCreateGroup();
                      }
                    }}
                  />
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
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Display */}
        {createError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
            <p className="font-medium text-destructive">Action Error</p>
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

        {/* Groups Grid */}
        {!groups || groups.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <CardTitle>No Groups Yet</CardTitle>
              <CardDescription>
                Create your first group to start collaborating with other players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card 
                key={group.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={(e) => handleCardClick(group.id, e)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {group.name}
                        {isGroupOwner(group) && (
                          <span title="You own this group">
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(group.created_at)}
                      </CardDescription>
                    </div>
                    
                    {/* Actions for group owners */}
                    {isGroupOwner(group) && (
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
                              <AlertDialogTitle>Delete Group</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{group.name}"? This action cannot be undone.
                                All group members will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteGroup(group.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Group
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
                    {/* Group Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={isGroupOwner(group) ? "default" : "secondary"}>
                        {isGroupOwner(group) ? "Owner" : "Member"}
                      </Badge>
                    </div>
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