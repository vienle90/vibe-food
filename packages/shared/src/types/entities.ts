import { z } from 'zod';
import {
  UserIdSchema,
  StoreIdSchema,
  MenuItemIdSchema,
  OrderIdSchema,
  OrderItemIdSchema,
  UserRoleSchema,
  StoreCategorySchema,
  OrderStatusSchema,
  PaymentMethodSchema,
} from './core';

/**
 * Database entity interfaces that match Prisma schema exactly.
 * These types represent the structure of data as stored in the database.
 */

/**
 * Base interface for entities with timestamps
 */
export interface TimestampFields {
  createdAt: string; // ISO string format for JSON serialization
  updatedAt: string; // ISO string format for JSON serialization
}

/**
 * User entity - matches Prisma User model exactly
 */
export const userEntitySchema = z.object({
  id: UserIdSchema,
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string(), // bcrypt hashed password (usually excluded from API responses)
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: UserRoleSchema.default('CUSTOMER'),
  isActive: z.boolean().default(true),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  address: z.string().max(200).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserEntity = z.infer<typeof userEntitySchema>;

/**
 * RefreshToken entity - matches Prisma RefreshToken model exactly
 */
export const refreshTokenEntitySchema = z.object({
  id: z.string().cuid(),
  token: z.string(),
  userId: UserIdSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type RefreshTokenEntity = z.infer<typeof refreshTokenEntitySchema>;

/**
 * Store entity - matches Prisma Store model exactly
 */
export const storeEntitySchema = z.object({
  id: StoreIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: StoreCategorySchema,
  isActive: z.boolean().default(true),
  address: z.string().min(1).max(200),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  email: z.string().email().optional(),
  rating: z.number().min(0).max(5).optional(), // Prisma Decimal becomes number in JSON
  deliveryFee: z.number().min(0).default(2.99), // Prisma Decimal becomes number in JSON
  minimumOrder: z.number().min(0).default(10.00), // Prisma Decimal becomes number in JSON
  estimatedDeliveryTime: z.number().int().min(1).default(30), // in minutes
  operatingHours: z.record(z.any()).default({}), // JSON field in Prisma
  ownerId: UserIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StoreEntity = z.infer<typeof storeEntitySchema>;

/**
 * MenuItem entity - matches Prisma MenuItem model exactly
 */
export const menuItemEntitySchema = z.object({
  id: MenuItemIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(), // Prisma Decimal becomes number in JSON
  category: z.string().min(1).max(50),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  preparationTime: z.number().int().min(1).default(15), // in minutes
  allergens: z.array(z.string()).default([]),
  nutritionalInfo: z.record(z.any()).optional(), // JSON field in Prisma
  storeId: StoreIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MenuItemEntity = z.infer<typeof menuItemEntitySchema>;

/**
 * Order entity - matches Prisma Order model exactly
 */
export const orderEntitySchema = z.object({
  id: OrderIdSchema,
  orderNumber: z.string().min(1),
  status: OrderStatusSchema.default('NEW'),
  subtotal: z.number().min(0), // Prisma Decimal becomes number in JSON
  deliveryFee: z.number().min(0), // Prisma Decimal becomes number in JSON
  tax: z.number().min(0), // Prisma Decimal becomes number in JSON
  total: z.number().min(0), // Prisma Decimal becomes number in JSON
  paymentMethod: PaymentMethodSchema.default('CASH_ON_DELIVERY'),
  deliveryAddress: z.string().min(1).max(200),
  customerPhone: z.string().regex(/^\+?[\d\s-()]+$/),
  notes: z.string().max(500).optional(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  actualDeliveryTime: z.string().datetime().optional(),
  customerId: UserIdSchema,
  storeId: StoreIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrderEntity = z.infer<typeof orderEntitySchema>;

/**
 * OrderItem entity - matches Prisma OrderItem model exactly
 */
export const orderItemEntitySchema = z.object({
  id: OrderItemIdSchema,
  quantity: z.number().int().min(1).max(10),
  unitPrice: z.number().positive(), // Prisma Decimal becomes number in JSON
  totalPrice: z.number().positive(), // Prisma Decimal becomes number in JSON
  specialInstructions: z.string().max(200).optional(),
  orderId: OrderIdSchema,
  menuItemId: MenuItemIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrderItemEntity = z.infer<typeof orderItemEntitySchema>;

/**
 * Detailed entity types with relations for complex queries
 */

/**
 * User without sensitive fields (password excluded)
 */
export const publicUserSchema = userEntitySchema.omit({ password: true });
export type PublicUser = z.infer<typeof publicUserSchema>;

/**
 * Store with owner details and statistics
 */
export const storeWithDetailsSchema = storeEntitySchema.extend({
  owner: publicUserSchema.pick({ id: true, firstName: true, lastName: true }),
  menuItems: z.array(menuItemEntitySchema).optional(),
  _count: z.object({
    orders: z.number().int().min(0),
    menuItems: z.number().int().min(0),
  }).optional(),
});

export type StoreWithDetails = z.infer<typeof storeWithDetailsSchema>;

/**
 * MenuItem with store details
 */
export const menuItemWithStoreSchema = menuItemEntitySchema.extend({
  store: storeEntitySchema.pick({ 
    id: true, 
    name: true, 
    category: true, 
    deliveryFee: true,
    minimumOrder: true,
  }),
});

export type MenuItemWithStore = z.infer<typeof menuItemWithStoreSchema>;

/**
 * Order with full details including store and items
 */
export const orderWithDetailsSchema = orderEntitySchema.extend({
  customer: publicUserSchema.pick({ 
    id: true, 
    firstName: true, 
    lastName: true, 
    email: true,
  }),
  store: storeEntitySchema.pick({ 
    id: true, 
    name: true, 
    category: true, 
    phone: true,
  }),
  items: z.array(orderItemEntitySchema.extend({
    menuItem: menuItemEntitySchema.pick({
      id: true,
      name: true,
      price: true,
      imageUrl: true,
    }),
  })),
});

export type OrderWithDetails = z.infer<typeof orderWithDetailsSchema>;

/**
 * Frontend-specific types for client-side state management
 */

/**
 * Cart item for frontend state (not persisted in database)
 */
export const cartItemSchema = z.object({
  menuItemId: MenuItemIdSchema,
  menuItem: menuItemEntitySchema.pick({
    id: true,
    name: true,
    price: true,
    imageUrl: true,
    storeId: true,
  }),
  quantity: z.number().int().min(1).max(10),
  specialInstructions: z.string().max(200).optional(),
  subtotal: z.number().positive(), // calculated field
});

export type CartItem = z.infer<typeof cartItemSchema>;

/**
 * Cart state for frontend (not persisted in database)
 */
export const cartSchema = z.object({
  storeId: StoreIdSchema.optional(),
  items: z.array(cartItemSchema).default([]),
  subtotal: z.number().min(0).default(0),
  itemCount: z.number().int().min(0).default(0),
});

export type Cart = z.infer<typeof cartSchema>;

/**
 * Utility types for entity operations
 */

/**
 * Create data types (omit auto-generated fields)
 */
export type CreateUserData = Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateStoreData = Omit<StoreEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateMenuItemData = Omit<MenuItemEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateOrderData = Omit<OrderEntity, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>;
export type CreateOrderItemData = Omit<OrderItemEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Update data types (partial and exclude non-updatable fields)
 */
export type UpdateUserData = Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt' | 'email'>>;
export type UpdateStoreData = Partial<Omit<StoreEntity, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>>;
export type UpdateMenuItemData = Partial<Omit<MenuItemEntity, 'id' | 'createdAt' | 'updatedAt' | 'storeId'>>;
export type UpdateOrderData = Partial<Omit<OrderEntity, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'customerId' | 'storeId'>>;

/**
 * Filter types for query parameters
 */
export type UserFilters = {
  role?: UserEntity['role'];
  isActive?: boolean;
  search?: string; // search in firstName, lastName, email
};

export type StoreFilters = {
  category?: StoreEntity['category'];
  isActive?: boolean;
  minRating?: number;
  maxDeliveryFee?: number;
  search?: string; // search in name, description
};

export type MenuItemFilters = {
  storeId?: StoreEntity['id'];
  category?: string;
  isAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string; // search in name, description
};

export type OrderFilters = {
  customerId?: UserEntity['id'];
  storeId?: StoreEntity['id'];
  status?: OrderEntity['status'];
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
};
