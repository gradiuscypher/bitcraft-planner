import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Copy, Trash2, Calendar, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupInvite } from '@/types/groups';

interface GroupInviteManagementProps {
  groupId: number;
  groupName: string;
  canManageInvites: boolean;
}

export function GroupInviteManagement({ groupId, groupName, canManageInvites }: GroupInviteManagementProps) {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create invite state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [isCreating, setIsCreating] = useState(false);
  
  // Copy state for individual invites
  const [copiedInvites, setCopiedInvites] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (canManageInvites) {
      loadInvites();
    }
  }, [groupId, canManageInvites]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      setError(null);
      const groupInvites = await groupsService.getGroupInvites(groupId);
      setInvites(groupInvites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      setIsCreating(true);
      const days = parseInt(expiresInDays, 10);
      if (isNaN(days) || days < 1 || days > 365) {
        toast.error('Please enter a valid number of days (1-365)');
        return;
      }

      const newInvite = await groupsService.createGroupInvite(groupId, {
        expires_in_days: days,
      });
      
      setInvites(prev => [newInvite, ...prev]);
      setIsCreateDialogOpen(false);
      setExpiresInDays('7');
      toast.success('Invite created successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invite';
      toast.error(message);
      console.error('Failed to create invite:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: number) => {
    try {
      await groupsService.deleteGroupInvite(inviteId);
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
      toast.success('Invite deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete invite';
      toast.error(message);
      console.error('Failed to delete invite:', err);
    }
  };

  const copyInviteLink = async (inviteCode: string, inviteId: number) => {
    try {
      const inviteUrl = `${window.location.origin}/join-group/${inviteCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      setCopiedInvites(prev => new Set(prev).add(inviteId));
      toast.success('Invite link copied to clipboard');
      
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedInvites(prev => {
          const newSet = new Set(prev);
          newSet.delete(inviteId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy invite link');
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (!canManageInvites) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Group Invites
          </CardTitle>
          <CardDescription>
            Only group owners and co-owners can manage invites.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Group Invites
            </CardTitle>
            <CardDescription>
              Manage invite links for "{groupName}"
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group Invite</DialogTitle>
                <DialogDescription>
                  Create a new invite link for "{groupName}". The link will expire after the specified number of days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expires-in-days">Expires in (days)</Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
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
                <Button onClick={handleCreateInvite} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Invite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading invites...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            Error: {error}
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvites}
              className="ml-2"
            >
              Retry
            </Button>
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invites created yet. Create your first invite to start inviting members to the group.
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {invite.invite_code}
                    </code>
                    {isExpired(invite.expires_at) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created: {formatDate(invite.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires: {formatDate(invite.expires_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invite.invite_code, invite.id)}
                    disabled={isExpired(invite.expires_at)}
                  >
                    {copiedInvites.has(invite.id) ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedInvites.has(invite.id) ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invite</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this invite? This action cannot be undone and the invite link will no longer work.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteInvite(invite.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
