import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, LogIn, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User as UserType } from '@/types/auth';

export function UserNav() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
  };

  const getAvatarUrl = (user: UserType | null): string | undefined => {
    if (!user?.avatar) return undefined;
    
    // Discord CDN URL format for avatars
    // Size 128 for better quality in the dropdown
    return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;
  };

  const getUserInitials = (user: UserType | null): string => {
    if (!user) return 'BC';
    
    // Use global_name first, then username as fallback
    const displayName = user.global_name || user.username || 'User';
    
    // Handle single word names and multi-word names
    const words = displayName.trim().split(/\s+/);
    if (words.length === 1) {
      // Single word: take first 2 characters
      return words[0].slice(0, 2).toUpperCase();
    } else {
      // Multiple words: take first letter of first 2 words
      return words.slice(0, 2)
        .map((word: string) => word[0])
        .join('')
        .toUpperCase();
    }
  };

  const getDisplayName = (user: UserType | null): string => {
    if (!user) return 'User';
    return user.global_name || user.username || 'User';
  };

  const getUserIdentifier = (user: UserType | null): string => {
    if (!user) return '';
    return user.email || `Discord ID: ${user.discord_id}`;
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={handleLogin} variant="ghost" size="sm">
        <LogIn className="h-4 w-4 mr-2" />
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={getAvatarUrl(user)} 
              alt={getDisplayName(user)}
              className="object-cover"
            />
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName(user)}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {getUserIdentifier(user)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 