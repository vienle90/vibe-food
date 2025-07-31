import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, StoreId, MenuItemId } from '@vibe/shared';
import { cartItemSchema, z } from '@vibe/shared';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  updateQuantity: (menuItemId: MenuItemId, quantity: number) => void;
  removeItem: (menuItemId: MenuItemId) => void;
  clearCart: () => void;
  clearStoreItems: (storeId: StoreId) => void;
  setIsOpen: (isOpen: boolean) => void;
  
  // Computed values
  getItemCount: () => number;
  getSubtotal: () => number;
  getItemsByStore: (storeId: StoreId) => CartItem[];
  getItemQuantity: (menuItemId: MenuItemId) => number;
}

const calculateSubtotal = (price: number, quantity: number): number => {
  return Math.round(price * quantity * 100) / 100; // Round to 2 decimal places
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const subtotal = calculateSubtotal(item.menuItem.price, item.quantity);
        const newItem: CartItem = { 
          menuItemId: item.menuItemId,
          menuItem: item.menuItem,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          subtotal 
        };
        
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.menuItemId === item.menuItemId
          );

          if (existingIndex !== -1) {
            // Update existing item quantity
            const items = [...state.items];
            const existingItem = items[existingIndex];
            if (existingItem) {
              const newQuantity = Math.min(existingItem.quantity + item.quantity, 10);
              items[existingIndex] = {
                ...existingItem,
                quantity: newQuantity,
                subtotal: calculateSubtotal(existingItem.menuItem.price, newQuantity),
                specialInstructions: item.specialInstructions || existingItem.specialInstructions,
              };
            }
            return { items };
          } else {
            // Add new item
            return { items: [...state.items, newItem] };
          }
        });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity < 1 || quantity > 10) return;
        
        set((state) => {
          if (quantity === 0) {
            return { items: state.items.filter((i) => i.menuItemId !== menuItemId) };
          }
          
          const items = state.items.map((item) => {
            if (item.menuItemId === menuItemId) {
              return {
                ...item,
                quantity,
                subtotal: calculateSubtotal(item.menuItem.price, quantity),
              };
            }
            return item;
          });
          
          return { items };
        });
      },

      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      clearStoreItems: (storeId) => {
        set((state) => ({
          items: state.items.filter((i) => i.menuItem.storeId !== storeId),
        }));
      },

      setIsOpen: (isOpen) => {
        set({ isOpen });
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        const state = get();
        return Math.round(
          state.items.reduce((sum, item) => sum + item.subtotal, 0) * 100
        ) / 100;
      },

      getItemsByStore: (storeId) => {
        const state = get();
        return state.items.filter((item) => item.menuItem.storeId === storeId);
      },

      getItemQuantity: (menuItemId) => {
        const state = get();
        const item = state.items.find((i) => i.menuItemId === menuItemId);
        return item?.quantity ?? 0;
      },
    }),
    {
      name: 'vibe-cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }), // Only persist items, not UI state
      onRehydrateStorage: () => (state) => {
        // Validate stored data on rehydration
        if (state) {
          const result = z.array(cartItemSchema).safeParse(state.items);
          if (result.success) {
            state.items = result.data;
          } else {
            console.warn('Invalid cart data in storage, clearing cart:', result.error);
            state.items = [];
          }
        }
      },
    }
  )
);

// Selectors for common use cases
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartIsOpen = () => useCartStore((state) => state.isOpen);

// Individual action hooks to prevent re-render issues
export const useAddToCart = () => useCartStore((state) => state.addItem);
export const useUpdateCartQuantity = () => useCartStore((state) => state.updateQuantity);
export const useRemoveFromCart = () => useCartStore((state) => state.removeItem);
export const useClearCart = () => useCartStore((state) => state.clearCart);
export const useSetCartOpen = () => useCartStore((state) => state.setIsOpen);

export const useCartSummary = () => {
  const itemCount = useCartStore((state) => state.getItemCount());
  const subtotal = useCartStore((state) => state.getSubtotal());
  return { itemCount, subtotal };
};