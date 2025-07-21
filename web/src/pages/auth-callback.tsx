import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useAuthCallback } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const { handleCallback, isProcessing, error } = useAuthCallback();
  const [isComplete, setIsComplete] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent multiple calls with the same code
      if (hasProcessed) {
        return;
      }

      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        return;
      }

      // Mark as processed immediately to prevent duplicate calls
      setHasProcessed(true);

      try {
        const user = await handleCallback(code);
        if (user) {
          // Refresh the auth context with the new user
          await refreshUser();
          setIsComplete(true);
          
          // Redirect to home page after a short delay
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        }
      } catch (err) {
        console.error('Callback processing failed:', err);
        // Reset hasProcessed on error so user can retry
        setHasProcessed(false);
      }
    };

    processCallback();
  }, [searchParams, handleCallback, refreshUser, navigate, hasProcessed]);

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isProcessing && 'Completing Login...'}
            {isComplete && 'Login Successful!'}
            {error && 'Login Failed'}
          </CardTitle>
          <CardDescription>
            {isProcessing && 'Processing your Discord authentication'}
            {isComplete && 'Welcome to Bitcraft Planner! Redirecting you now.'}
            {error && 'There was an issue with your authentication'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          {isProcessing && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {isComplete && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Redirecting to home page...
              </p>
            </div>
          )}
          
          {error && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return Home
                </Button>
              </div>
            </div>
          )}
          
          {!isProcessing && !error && !isComplete && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No authorization code received. Please try logging in again.
              </p>
              <Button onClick={handleRetry} className="w-full">
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 