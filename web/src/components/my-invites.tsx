import { useState, useEffect } from 'react';
import { groupsService } from '@/lib/groups-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Copy, Trash2, Calendar, ExternalLink, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupInvite } from '@/types/groups';

export function MyInvites() {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Copy state for individual invites
  const [copiedInvites, setCopiedInvites] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isDialogOpen) {
      loadMyInvites();
    }
  }, [isDialogOpen]);

  const loadMyInvites = async () => {
    try {
      setLoading(true);
      setError(null);
      const myInvites = await groupsService.getMyInvites();
      setInvites(myInvites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
      console.error('Failed to load my invites:', err);
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          My Invites
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            My Invites
          </DialogTitle>
          <DialogDescription>
            All invite links you've created across different groups
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8">Loading your invites...</div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button variant="outline" size="sm" onClick={loadMyInvites}>
                Retry
              </Button>
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <ExternalLink className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground font-medium mb-2">No Invites Created</p>
              <p className="text-sm text-muted-foreground">
                You haven't created any group invites yet. Create invites from group detail pages to start inviting members.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
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
                        <div className="text-sm text-muted-foreground space-y-1">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
