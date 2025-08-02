'use client';

import { ReactElement, useEffect, useState } from 'react';
import { User, Settings, LogOut, Store, PackageSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useAccessToken } from '@/stores/auth';
import { storeService } from '@/lib/api-services';
import type { AuthUser } from '@vibe/shared';

interface UserMenuProps {
  user: AuthUser;
}

export function UserMenu({ user }: UserMenuProps): ReactElement {
  const router = useRouter();
  const { logout, isLoading } = useAuth();
  const accessToken = useAccessToken();
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDisplayName = (firstName: string, lastName: string): string => {
    return `${firstName} ${lastName}`;
  };

  // Fetch user's store if they are a store owner
  useEffect(() => {
    const fetchUserStore = async () => {
      if (user.role === 'STORE_OWNER' && accessToken) {
        setIsLoadingStore(true);
        try {
          // Get stores owned by this user
          const response = await storeService.getMyStores(accessToken);
          
          // Use the first store if the user owns any
          if (response.stores && response.stores.length > 0) {
            const firstStore = response.stores[0];
            if (firstStore) {
              setUserStoreId(firstStore.id);
            }
          }
        } catch (error) {
          // Failed to fetch user store - silently ignore
        } finally {
          setIsLoadingStore(false);
        }
      }
    };

    fetchUserStore();
  }, [user.role, accessToken]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full"
          disabled={isLoading}
          aria-label={`User menu for ${getDisplayName(user.firstName, user.lastName)}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName(user.firstName, user.lastName)}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => router.push('/orders')}
        >
          <PackageSearch className="mr-2 h-4 w-4" />
          <span>My Orders</span>
        </DropdownMenuItem>
        
        {user.role === 'STORE_OWNER' && userStoreId && (
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => router.push(`/store-owner/${userStoreId}/orders`)}
            disabled={isLoadingStore}
          >
            <Store className="mr-2 h-4 w-4" />
            <span>{isLoadingStore ? 'Loading...' : 'Manage Store Orders'}</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => router.push('/profile')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoading}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Logging out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}