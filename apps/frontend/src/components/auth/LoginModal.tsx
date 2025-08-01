'use client';

import { ReactElement, useState } from 'react';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { loginRequestSchema, type LoginRequest } from '@vibe/shared';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps): ReactElement {
  const { login, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginRequest>({
    identifier: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const result = loginRequestSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return false;
    }
    
    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      onClose();
      // Reset form
      setFormData({ identifier: '', password: '' });
      setFormErrors({});
    } catch (error) {
      // Error handling is done in useAuth hook
    }
  };

  const handleInputChange = (field: keyof LoginRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // Reset form state
      setFormData({ identifier: '', password: '' });
      setFormErrors({});
    }
  };

  const handleSwitchToRegister = () => {
    if (!isLoading) {
      handleClose();
      onSwitchToRegister();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <LogIn className="h-5 w-5" />
            <span>Sign In</span>
          </DialogTitle>
          <DialogDescription>
            Enter your email or username and password to sign in to your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium">
              Email or Username
            </label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter your email or username"
              value={formData.identifier}
              onChange={handleInputChange('identifier')}
              disabled={isLoading}
              className={formErrors.identifier ? 'border-destructive' : ''}
              aria-describedby={formErrors.identifier ? 'identifier-error' : undefined}
            />
            {formErrors.identifier && (
              <p id="identifier-error" className="text-sm text-destructive">
                {formErrors.identifier}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                className={formErrors.password ? 'border-destructive pr-10' : 'pr-10'}
                aria-describedby={formErrors.password ? 'password-error' : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {formErrors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {formErrors.password}
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSwitchToRegister}
                disabled={isLoading}
                className="text-sm"
              >
                Don't have an account? Register
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}