'use client';

import { ReactElement, useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { UserMenu } from './UserMenu';

interface AuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function AuthButton({ 
  variant = 'ghost', 
  size = 'default' 
}: AuthButtonProps): ReactElement {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleCloseModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  // Show user menu if authenticated
  if (isAuthenticated && user) {
    return <UserMenu user={user} />;
  }

  // Show login button if not authenticated
  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={() => setShowLoginModal(true)}
        className="flex items-center space-x-2"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Login</span>
      </Button>
      
      <LoginModal 
        isOpen={showLoginModal}
        onClose={handleCloseModals}
        onSwitchToRegister={handleSwitchToRegister}
      />

      <RegisterModal 
        isOpen={showRegisterModal}
        onClose={handleCloseModals}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}