'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Package, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartButton } from '@/components/cart/CartButton';
import { useCartSummary } from '@/stores/cart';

export function Header(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  useCartSummary();
  
  const isOrdersPage = pathname?.startsWith('/orders');
  const isHomePage = pathname === '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-lg">Vibe</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            href="/" 
            className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isHomePage 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Restaurants</span>
          </Link>
          
          <Link 
            href="/orders" 
            className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isOrdersPage 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders</span>
          </Link>
        </nav>

        {/* Mobile Navigation + Cart */}
        <div className="flex items-center space-x-2">
          {/* Mobile Orders Button */}
          <div className="md:hidden">
            <Button
              variant={isOrdersPage ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push('/orders')}
              className="flex items-center space-x-1"
            >
              <Package className="w-4 h-4" />
              <span className="hidden xs:inline">Orders</span>
            </Button>
          </div>

          {/* Cart Button */}
          <CartButton variant="inline" />
        </div>
      </div>
    </header>
  );
}