'use client';

import { ReactElement, useState } from 'react';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';
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
import { registerRequestSchema, type RegisterRequest } from '@vibe/shared';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps): ReactElement {
  const { register, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    phone: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const result = registerRequestSchema.safeParse(formData);
    
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
      await register(formData);
      onClose();
      // Reset form
      setFormData({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        password: '',
        phone: '',
        address: '',
      });
      setFormErrors({});
    } catch (error) {
      // Error handling is done in useAuth hook
    }
  };

  const handleInputChange = (field: keyof RegisterRequest) => (
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
      setFormData({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        password: '',
        phone: '',
        address: '',
      });
      setFormErrors({});
    }
  };

  const handleSwitchToLogin = () => {
    if (!isLoading) {
      handleClose();
      onSwitchToLogin();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Create Account</span>
          </DialogTitle>
          <DialogDescription>
            Fill in your information to create a new account and start ordering.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name *
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                disabled={isLoading}
                className={formErrors.firstName ? 'border-destructive' : ''}
                aria-describedby={formErrors.firstName ? 'firstName-error' : undefined}
              />
              {formErrors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {formErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name *
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                disabled={isLoading}
                className={formErrors.lastName ? 'border-destructive' : ''}
                aria-describedby={formErrors.lastName ? 'lastName-error' : undefined}
              />
              {formErrors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {formErrors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={isLoading}
              className={formErrors.email ? 'border-destructive' : ''}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
            />
            {formErrors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {formErrors.email}
              </p>
            )}
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username *
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange('username')}
              disabled={isLoading}
              className={formErrors.username ? 'border-destructive' : ''}
              aria-describedby={formErrors.username ? 'username-error' : undefined}
            />
            {formErrors.username && (
              <p id="username-error" className="text-sm text-destructive">
                {formErrors.username}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password *
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
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

          {/* Optional Fields */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number (Optional)
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="Your phone number"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              disabled={isLoading}
              className={formErrors.phone ? 'border-destructive' : ''}
              aria-describedby={formErrors.phone ? 'phone-error' : undefined}
            />
            {formErrors.phone && (
              <p id="phone-error" className="text-sm text-destructive">
                {formErrors.phone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">
              Address (Optional)
            </label>
            <Input
              id="address"
              type="text"
              placeholder="Your delivery address"
              value={formData.address}
              onChange={handleInputChange('address')}
              disabled={isLoading}
              className={formErrors.address ? 'border-destructive' : ''}
              aria-describedby={formErrors.address ? 'address-error' : undefined}
            />
            {formErrors.address && (
              <p id="address-error" className="text-sm text-destructive">
                {formErrors.address}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3 pt-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
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
                onClick={handleSwitchToLogin}
                disabled={isLoading}
                className="text-sm"
              >
                Already have an account? Sign In
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}