import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { groupsService } from '@/lib/groups-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';

export function JoinGroupPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);

  // If auth has resolved and there's no user, redirect immediately
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // If no invite code, redirect to groups
  if (!inviteCode) {
    return <Navigate to="/groups" replace />;
  }

  const handleJoinGroup = async () => {
    if (!inviteCode) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await groupsService.joinGroupWithInvite(inviteCode);
      setSuccess(true);
      setGroupName(response.message.split("'")[1] || 'the group'); // Extract group name from message
      
      // Redirect to groups page after a short delay
      setTimeout(() => {
        navigate('/groups');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
      console.error('Failed to join group:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {success ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : error ? (
                  <XCircle className="h-12 w-12 text-red-500" />
                ) : (
                  <Users className="h-12 w-12 text-blue-500" />
                )}
              </div>
              <CardTitle>
                {success 
                  ? 'Successfully Joined Group!' 
                  : error 
                    ? 'Failed to Join Group' 
                    : 'Join Group'
                }
              </CardTitle>
              <CardDescription>
                {success 
                  ? `You have successfully joined ${groupName}. Redirecting to groups page...`
                  : error 
                    ? 'There was an issue with the invite link.'
                    : 'You have been invited to join a group. Click the button below to accept the invitation.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You can now access group projects and collaborate with other members.
                  </AlertDescription>
                </Alert>
              )}
              
              {!success && !error && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <strong>Invite Code:</strong> <code className="bg-muted px-1 py-0.5 rounded">{inviteCode}</code>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                {!success && !error && (
                  <Button 
                    onClick={handleJoinGroup} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Group...
                      </>
                    ) : (
                      'Join Group'
                    )}
                  </Button>
                )}
                
                {error && (
                  <Button 
                    onClick={handleJoinGroup} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      'Try Again'
                    )}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/groups')}
                  className="w-full"
                >
                  {success ? 'Go to Groups' : 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
