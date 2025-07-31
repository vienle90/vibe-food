import { PrismaClient, Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';
import { OrderFilters, CreateOrderData, CreateOrderItemData } from '../types/order.types';

export interface OrderWithDetails extends Order {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    category: string;
    phone: string | null;
  };
  items: Array<OrderItem & {
    menuItem: {
      id: string;
      name: string;
      price: number;
      imageUrl: string | null;
    };
  }>;
}

export class OrderRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create an order with items in a transaction to ensure atomicity
   */
  async createOrderWithItems(
    orderData: CreateOrderData,
    orderItems: CreateOrderItemData[]
  ): Promise<OrderWithDetails> {
    return await this.prisma.$transaction(async (tx) => {
      // Generate unique order number
      const orderNumber = await this.generateOrderNumber(tx);

      // Create the order
      const order = await tx.order.create({
        data: {
          ...orderData,
          orderNumber,
        },
      });

      // Create order items
      const createdItems = await Promise.all(
        orderItems.map((item) =>
          tx.orderItem.create({
            data: {
              ...item,
              orderId: order.id,
            },
          })
        )
      );

      // Update store total orders count
      await tx.store.update({
        where: { id: orderData.storeId },
        data: {
          totalOrders: {
            increment: 1,
          },
        },
      });

      // Return full order with details
      return await this.findByIdWithDetails(order.id, tx);
    });
  }

  /**
   * Find order by ID with all related details
   */
  async findByIdWithDetails(
    orderId: string,
    tx?: Prisma.TransactionClient
  ): Promise<OrderWithDetails> {
    const client = tx || this.prisma;
    
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            category: true,
            phone: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    return order as OrderWithDetails;
  }

  /**
   * Find orders with filtering and pagination
   */
  async findMany(
    filters: OrderFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: Order[]; total: number }> {
    const where = this.buildWhereClause(filters);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          store: {
            select: {
              name: true,
              category: true,
            },
          },
          items: {
            select: {
              quantity: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders: orders as Order[], total };
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    notes?: string
  ): Promise<Order> {
    return await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        notes: notes || undefined,
        actualDeliveryTime: status === 'DELIVERED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Find orders by customer ID
   */
  async findByCustomerId(
    customerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: Order[]; total: number }> {
    return this.findMany(
      { customerId },
      page,
      limit
    );
  }

  /**
   * Find orders by store ID (for store owners)
   */
  async findByStoreId(
    storeId: string,
    status?: OrderStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: Order[]; total: number }> {
    return this.findMany(
      { storeId, status },
      page,
      limit
    );
  }

  /**
   * Check if an order belongs to a customer
   */
  async belongsToCustomer(orderId: string, customerId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });
    
    return order?.customerId === customerId;
  }

  /**
   * Check if an order belongs to a store
   */
  async belongsToStore(orderId: string, storeId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { storeId: true },
    });
    
    return order?.storeId === storeId;
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of orders today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayOrderCount = await tx.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    
    const orderSequence = String(todayOrderCount + 1).padStart(3, '0');
    
    return `ORD-${year}${month}${day}-${orderSequence}`;
  }

  /**
   * Build where clause for filtering orders
   */
  private buildWhereClause(filters: OrderFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    return where;
  }

  /**
   * Get order statistics for a store
   */
  async getStoreOrderStats(storeId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  }> {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      revenueResult,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { storeId },
      }),
      this.prisma.order.count({
        where: {
          storeId,
          status: {
            in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'],
          },
        },
      }),
      this.prisma.order.count({
        where: {
          storeId,
          status: 'DELIVERED',
        },
      }),
      this.prisma.order.aggregate({
        where: {
          storeId,
          status: 'DELIVERED',
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: Number(revenueResult._sum.total || 0),
    };
  }
}