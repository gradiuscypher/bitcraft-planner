import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { groupsService } from '@/lib/groups-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Crown, 
  UserPlus, 
  UserMinus, 
  Folder, 
  Plus,
  Settings,
  Trash2
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import type { GroupWithDetails, BasicUser } from '@/types/groups';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Member state
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Load group details on component mount
  useEffect(() => {
    if (groupId) {
      loadGroupDetails(parseInt(groupId));
    }
  }, [groupId]);

  const loadGroupDetails = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const groupDetails = await groupsService.getGroup(id);
      setGroup(groupDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group details');
      console.error('Failed to load group details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberDiscordId: string) => {
    if (!group) return;
    
    try {
      await groupsService.removeUserFromGroup(group.id, memberDiscordId);
      await loadGroupDetails(group.id); // Refresh the group details
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      console.error('Failed to remove member:', err);
    }
  };

  const handleAddMember = async () => {
    if (!memberIdentifier.trim() || !group) return;

    try {
      setIsAddingMember(true);
      
      // The identifier should be a Discord ID (string)
      const discordId = memberIdentifier.trim();
      
      // Basic validation for Discord ID format (should be a string of digits)
      if (!/^\d+$/.test(discordId)) {
        setError('Please enter a valid Discord ID (numbers only).');
        return;
      }

      await groupsService.addUserToGroup(group.id, discordId);
      setMemberIdentifier('');
      setIsAddMemberDialogOpen(false);
      await loadGroupDetails(group.id); // Refresh the group details
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member to group');
      console.error('Failed to add member:', err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const openAddMemberDialog = () => {
    setIsAddMemberDialogOpen(true);
    setMemberIdentifier('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAvatarUrl = (member: BasicUser): string | undefined => {
    if (!member.avatar) return undefined;
    return `https://cdn.discordapp.com/avatars/${member.discord_id}/${member.avatar}.png?size=64`;
  };

  const getUserInitials = (member: BasicUser): string => {
    const displayName = member.global_name || member.username || 'User';
    const words = displayName.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    } else {
      return words.slice(0, 2)
        .map((word: string) => word[0])
        .join('')
        .toUpperCase();
    }
  };

  const getDisplayName = (member: BasicUser): string => {
    return member.global_name || member.username || 'User';
  };

  const isGroupOwner = () => {
    return user?.id === group?.owner_id;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading group details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-6 mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/groups')}
            >
              Back to Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <p className="text-muted-foreground">Group not found</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/groups')}
          >
            Back to Groups
          </Button>
        </div>
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
              onClick={() => navigate('/groups')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Groups
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                {group.name}
                {isGroupOwner() && (
                  <span title="You own this group">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {formatDate(group.created_at)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isGroupOwner() && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
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
                      onClick={async () => {
                        try {
                          await groupsService.deleteGroup(group.id);
                          navigate('/groups');
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to delete group');
                        }
                      }}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Members Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Members
                    <Badge variant="secondary">{group.users.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    People who have access to this group
                  </CardDescription>
                </div>
                {isGroupOwner() && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={openAddMemberDialog}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.users.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage 
                          src={getAvatarUrl(member)} 
                          alt={getDisplayName(member)} 
                        />
                        <AvatarFallback>
                          {getUserInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getDisplayName(member)}</p>
                        <p className="text-sm text-muted-foreground">@{member.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.id === group.owner_id ? (
                        <Badge variant="default">Owner</Badge>
                      ) : (
                        <>
                          <Badge variant="secondary">Member</Badge>
                          {isGroupOwner() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {getDisplayName(member)} from this group?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveMember(member.discord_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove Member
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projects Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Projects
                    <Badge variant="secondary">0</Badge>
                  </CardTitle>
                  <CardDescription>
                    Collaborative projects this group is working on
                  </CardDescription>
                </div>
                {isGroupOwner() && (
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <Folder className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-muted-foreground font-medium mb-2">No Projects Yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start collaborating by creating your first project
                </p>
                {isGroupOwner() && (
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to Group</DialogTitle>
            <DialogDescription>
              Add a new member to this group using their Discord ID.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-identifier">Discord ID</Label>
              <Input
                id="member-identifier"
                placeholder="Enter Discord ID (e.g., 353241317079384060)..."
                value={memberIdentifier}
                onChange={(e) => setMemberIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAddingMember) {
                    handleAddMember();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the 18-digit Discord ID. The user must have logged in to the app at least once.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddMemberDialogOpen(false);
                setMemberIdentifier('');
              }}
              disabled={isAddingMember}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddMember}
              disabled={!memberIdentifier.trim() || isAddingMember}
            >
              {isAddingMember ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
} 