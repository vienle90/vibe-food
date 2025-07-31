import { PrismaClient } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Comprehensive database seeding script for Vibe food ordering application
 * 
 * This script creates realistic test data including:
 * - Users with different roles (Customer, Store Owner, Admin)
 * - Stores across multiple categories
 * - Menu items with proper pricing and descriptions
 * - Sample orders with order items
 * 
 * Uses upsert operations to avoid duplicate data on re-runs.
 */

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    // Create test users
    console.log('👥 Creating users...');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@vibe.com' },
      update: {},
      create: {
        email: 'admin@vibe.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        phone: '+1-555-0100',
        address: '123 Admin Street, Admin City, AC 12345',
      },
    });
    
    // Create store owners
    const pizzaOwner = await prisma.user.upsert({
      where: { email: 'pizza.owner@vibe.com' },
      update: {},
      create: {
        email: 'pizza.owner@vibe.com',
        username: 'mario_pizza',
        password: hashedPassword,
        firstName: 'Mario',
        lastName: 'Rossi',
        role: 'STORE_OWNER',
        phone: '+1-555-0201',
        address: '456 Pizza Lane, Food City, FC 12345',
      },
    });
    
    const coffeeOwner = await prisma.user.upsert({
      where: { email: 'coffee.owner@vibe.com' },
      update: {},
      create: {
        email: 'coffee.owner@vibe.com',
        username: 'sarah_coffee',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Bean',
        role: 'STORE_OWNER',
        phone: '+1-555-0202',
        address: '789 Coffee Street, Brew City, BC 12345',
      },
    });
    
    const sushiOwner = await prisma.user.upsert({
      where: { email: 'sushi.owner@vibe.com' },
      update: {},
      create: {
        email: 'sushi.owner@vibe.com',
        username: 'takeshi_sushi',
        password: hashedPassword,
        firstName: 'Takeshi',
        lastName: 'Yamamoto',
        role: 'STORE_OWNER',
        phone: '+1-555-0203',
        address: '321 Sushi Boulevard, Japan Town, JT 12345',
      },
    });
    
    // Create customers
    const customer1 = await prisma.user.upsert({
      where: { email: 'john.doe@example.com' },
      update: {},
      create: {
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        phone: '+1-555-0301',
        address: '123 Customer Avenue, City, ST 12345',
      },
    });
    
    const customer2 = await prisma.user.upsert({
      where: { email: 'jane.smith@example.com' },
      update: {},
      create: {
        email: 'jane.smith@example.com',
        username: 'janesmith',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'CUSTOMER',
        phone: '+1-555-0302',
        address: '456 User Street, Town, ST 12345',
      },
    });
    
    console.log('✅ Users created successfully');
    
    // Create stores
    console.log('🏪 Creating stores...');
    
    const pizzaStore = await prisma.store.upsert({
      where: { id: 'pizza-store-1' },
      update: {},
      create: {
        id: 'pizza-store-1',
        name: "Mario's Authentic Pizza",
        description: 'Traditional Italian pizza made with fresh ingredients and wood-fired ovens. Family recipe since 1952.',
        category: 'LUNCH',
        address: '123 Pizza Street, Little Italy, NY 10013',
        phone: '+1-212-555-0001',
        email: 'info@mariospizza.com',
        rating: 4.7,
        deliveryFee: 2.99,
        minimumOrder: 15.00,
        estimatedDeliveryTime: 25,
        operatingHours: {
          monday: { open: '11:00', close: '22:00' },
          tuesday: { open: '11:00', close: '22:00' },
          wednesday: { open: '11:00', close: '22:00' },
          thursday: { open: '11:00', close: '22:00' },
          friday: { open: '11:00', close: '23:00' },
          saturday: { open: '11:00', close: '23:00' },
          sunday: { open: '12:00', close: '21:00' },
        },
        ownerId: pizzaOwner.id,
      },
    });
    
    const coffeeStore = await prisma.store.upsert({
      where: { id: 'coffee-store-1' },
      update: {},
      create: {
        id: 'coffee-store-1',
        name: 'Bean There Coffee Co.',
        description: 'Artisan coffee roasted daily. Perfect for your morning caffeine fix or afternoon break.',
        category: 'COFFEE',
        address: '456 Coffee Avenue, Brew District, CA 94102',
        phone: '+1-415-555-0002',
        email: 'hello@beanthere.com',
        rating: 4.5,
        deliveryFee: 1.99,
        minimumOrder: 8.00,
        estimatedDeliveryTime: 15,
        operatingHours: {
          monday: { open: '06:00', close: '19:00' },
          tuesday: { open: '06:00', close: '19:00' },
          wednesday: { open: '06:00', close: '19:00' },
          thursday: { open: '06:00', close: '19:00' },
          friday: { open: '06:00', close: '20:00' },
          saturday: { open: '07:00', close: '20:00' },
          sunday: { open: '07:00', close: '18:00' },
        },
        ownerId: coffeeOwner.id,
      },
    });
    
    const sushiStore = await prisma.store.upsert({
      where: { id: 'sushi-store-1' },
      update: {},
      create: {
        id: 'sushi-store-1',
        name: 'Sakura Sushi House',
        description: 'Fresh sushi and Japanese cuisine prepared by master chefs. Premium quality fish delivered daily.',
        category: 'DINNER',
        address: '789 Sushi Lane, Japan Town, SF 94115',
        phone: '+1-415-555-0003',
        email: 'orders@sakurasushi.com',
        rating: 4.9,
        deliveryFee: 3.99,
        minimumOrder: 20.00,
        estimatedDeliveryTime: 35,
        operatingHours: {
          monday: { open: '17:00', close: '22:00' },
          tuesday: { open: '17:00', close: '22:00' },
          wednesday: { open: '17:00', close: '22:00' },
          thursday: { open: '17:00', close: '22:00' },
          friday: { open: '17:00', close: '23:00' },
          saturday: { open: '16:00', close: '23:00' },
          sunday: { open: '16:00', close: '21:00' },
        },
        ownerId: sushiOwner.id,
      },
    });
    
    const dessertStore = await prisma.store.upsert({
      where: { id: 'dessert-store-1' },
      update: {},
      create: {
        id: 'dessert-store-1',
        name: 'Sweet Dreams Bakery',
        description: 'Handcrafted desserts, cakes, and pastries made fresh daily with premium ingredients.',
        category: 'DESSERT',
        address: '321 Sweet Street, Sugar Hill, NY 10033',
        phone: '+1-212-555-0004',
        email: 'orders@sweetdreams.com',
        rating: 4.6,
        deliveryFee: 2.49,
        minimumOrder: 12.00,
        estimatedDeliveryTime: 20,
        operatingHours: {
          monday: { open: '08:00', close: '20:00' },
          tuesday: { open: '08:00', close: '20:00' },
          wednesday: { open: '08:00', close: '20:00' },
          thursday: { open: '08:00', close: '20:00' },
          friday: { open: '08:00', close: '21:00' },
          saturday: { open: '08:00', close: '21:00' },
          sunday: { open: '09:00', close: '19:00' },
        },
        ownerId: pizzaOwner.id, // Pizza owner owns multiple stores
      },
    });
    
    console.log('✅ Stores created successfully');
    
    // Create menu items
    console.log('🍕 Creating menu items...');
    
    // Pizza menu items
    const pizzaMenuItems = [
      {
        id: 'pizza-margherita',
        name: 'Margherita Pizza',
        description: 'Classic pizza with fresh tomato sauce, mozzarella cheese, and basil leaves',
        price: 16.99,
        category: 'Pizza',
        preparationTime: 18,
        allergens: ['gluten', 'dairy'],
        nutritionalInfo: { calories: 280, protein: 12, carbs: 30, fat: 11 },
        imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'pizza-pepperoni',
        name: 'Pepperoni Pizza',
        description: 'Traditional pepperoni pizza with tomato sauce and mozzarella cheese',
        price: 18.99,
        category: 'Pizza',
        preparationTime: 18,
        allergens: ['gluten', 'dairy'],
        nutritionalInfo: { calories: 320, protein: 14, carbs: 32, fat: 15 },
        imageUrl: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'pizza-veggie',
        name: 'Vegetarian Supreme',
        description: 'Bell peppers, mushrooms, onions, olives, and tomatoes on cheese pizza',
        price: 19.99,
        category: 'Pizza',
        preparationTime: 20,
        allergens: ['gluten', 'dairy'],
        nutritionalInfo: { calories: 260, protein: 11, carbs: 35, fat: 9 },
        imageUrl: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'pizza-garlic-bread',
        name: 'Garlic Bread',
        description: 'Fresh baked bread with garlic butter and herbs',
        price: 7.99,
        category: 'Sides',
        preparationTime: 8,
        allergens: ['gluten', 'dairy'],
        nutritionalInfo: { calories: 180, protein: 4, carbs: 28, fat: 6 },
        imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=400&h=300&fit=crop&crop=center',
      },
    ];
    
    for (const item of pizzaMenuItems) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          ...item,
          storeId: pizzaStore.id,
        },
      });
    }
    
    // Coffee menu items
    const coffeeMenuItems = [
      {
        id: 'coffee-espresso',
        name: 'Espresso',
        description: 'Rich and bold single shot of premium espresso',
        price: 3.50,
        category: 'Coffee',
        preparationTime: 3,
        allergens: [],
        nutritionalInfo: { calories: 5, protein: 0, carbs: 1, fat: 0 },
        imageUrl: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'coffee-latte',
        name: 'Café Latte',
        description: 'Smooth espresso with steamed milk and light foam',
        price: 5.25,
        category: 'Coffee',
        preparationTime: 5,
        allergens: ['dairy'],
        nutritionalInfo: { calories: 120, protein: 6, carbs: 12, fat: 4 },
        imageUrl: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'coffee-cappuccino',
        name: 'Cappuccino',
        description: 'Equal parts espresso, steamed milk, and milk foam',
        price: 4.75,
        category: 'Coffee',
        preparationTime: 5,
        allergens: ['dairy'],
        nutritionalInfo: { calories: 80, protein: 4, carbs: 8, fat: 3 },
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'coffee-croissant',
        name: 'Butter Croissant',
        description: 'Flaky, buttery French pastry perfect with coffee',
        price: 3.25,
        category: 'Pastries',
        preparationTime: 2,
        allergens: ['gluten', 'dairy', 'eggs'],
        nutritionalInfo: { calories: 230, protein: 5, carbs: 26, fat: 12 },
        imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&h=300&fit=crop&crop=center',
      },
    ];
    
    for (const item of coffeeMenuItems) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          ...item,
          storeId: coffeeStore.id,
        },
      });
    }
    
    // Sushi menu items
    const sushiMenuItems = [
      {
        id: 'sushi-salmon-roll',
        name: 'Salmon Avocado Roll',
        description: 'Fresh salmon and avocado wrapped in seasoned rice and nori',
        price: 12.99,
        category: 'Rolls',
        preparationTime: 12,
        allergens: ['fish'],
        nutritionalInfo: { calories: 200, protein: 18, carbs: 20, fat: 8 },
        imageUrl: 'https://images.unsplash.com/photo-1563612116625-3012372fccce?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'sushi-california-roll',
        name: 'California Roll',
        description: 'Crab, avocado, and cucumber with sesame seeds',
        price: 10.99,
        category: 'Rolls',
        preparationTime: 10,
        allergens: ['shellfish'],
        nutritionalInfo: { calories: 175, protein: 8, carbs: 22, fat: 6 },
        imageUrl: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'sushi-tuna-sashimi',
        name: 'Tuna Sashimi (6 pcs)',
        description: 'Fresh bluefin tuna sliced to perfection',
        price: 18.99,
        category: 'Sashimi',
        preparationTime: 8,
        allergens: ['fish'],
        nutritionalInfo: { calories: 160, protein: 32, carbs: 0, fat: 2 },
        imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'sushi-miso-soup',
        name: 'Miso Soup',
        description: 'Traditional soybean soup with tofu and wakame',
        price: 4.99,
        category: 'Soup',
        preparationTime: 5,
        allergens: ['soy'],
        nutritionalInfo: { calories: 35, protein: 3, carbs: 4, fat: 1 },
        imageUrl: 'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=400&h=300&fit=crop&crop=center',
      },
    ];
    
    for (const item of sushiMenuItems) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          ...item,
          storeId: sushiStore.id,
        },
      });
    }
    
    // Dessert menu items
    const dessertMenuItems = [
      {
        id: 'dessert-chocolate-cake',
        name: 'Chocolate Fudge Cake',
        description: 'Rich chocolate cake with fudge frosting and chocolate shavings',
        price: 8.99,
        category: 'Cakes',
        preparationTime: 5,
        allergens: ['gluten', 'dairy', 'eggs'],
        nutritionalInfo: { calories: 450, protein: 6, carbs: 58, fat: 22 },
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'dessert-cheesecake',
        name: 'New York Cheesecake',
        description: 'Classic creamy cheesecake with graham cracker crust',
        price: 7.99,
        category: 'Cakes',
        preparationTime: 3,
        allergens: ['gluten', 'dairy', 'eggs'],
        nutritionalInfo: { calories: 410, protein: 8, carbs: 35, fat: 28 },
        imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop&crop=center',
      },
      {
        id: 'dessert-tiramisu',
        name: 'Tiramisu',
        description: 'Italian dessert with coffee-soaked ladyfingers and mascarpone',
        price: 9.99,
        category: 'Italian',
        preparationTime: 3,
        allergens: ['gluten', 'dairy', 'eggs'],
        nutritionalInfo: { calories: 380, protein: 7, carbs: 42, fat: 20 },
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop&crop=center',
      },
    ];
    
    for (const item of dessertMenuItems) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          ...item,
          storeId: dessertStore.id,
        },
      });
    }
    
    console.log('✅ Menu items created successfully');
    
    // Create sample orders
    console.log('📋 Creating sample orders...');
    
    // Order 1: Pizza order
    const order1 = await prisma.order.upsert({
      where: { id: 'order-1' },
      update: {},
      create: {
        id: 'order-1',
        orderNumber: 'ORD-001-2024',
        customerId: customer1.id,
        storeId: pizzaStore.id,
        status: 'DELIVERED',
        subtotal: 24.98,
        deliveryFee: 2.99,
        tax: 2.00,
        total: 29.97,
        paymentMethod: 'CASH_ON_DELIVERY',
        deliveryAddress: '123 Customer Avenue, City, ST 12345',
        customerPhone: '+1-555-0301',
        notes: 'Please ring doorbell',
        estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        actualDeliveryTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      },
    });
    
    // Order items for order 1
    await prisma.orderItem.upsert({
      where: { id: 'order-item-1' },
      update: {},
      create: {
        id: 'order-item-1',
        orderId: order1.id,
        menuItemId: 'pizza-margherita',
        quantity: 1,
        unitPrice: 16.99,
        totalPrice: 16.99,
      },
    });
    
    await prisma.orderItem.upsert({
      where: { id: 'order-item-2' },
      update: {},
      create: {
        id: 'order-item-2',
        orderId: order1.id,
        menuItemId: 'pizza-garlic-bread',
        quantity: 1,
        unitPrice: 7.99,
        totalPrice: 7.99,
      },
    });
    
    // Order 2: Coffee order
    const order2 = await prisma.order.upsert({
      where: { id: 'order-2' },
      update: {},
      create: {
        id: 'order-2',
        orderNumber: 'ORD-002-2024',
        customerId: customer2.id,
        storeId: coffeeStore.id,
        status: 'READY',
        subtotal: 8.50,
        deliveryFee: 1.99,
        tax: 0.68,
        total: 11.17,
        paymentMethod: 'CASH_ON_DELIVERY',
        deliveryAddress: '456 User Street, Town, ST 12345',
        customerPhone: '+1-555-0302',
        notes: 'Extra hot coffee please',
        estimatedDeliveryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    });
    
    // Order items for order 2
    await prisma.orderItem.upsert({
      where: { id: 'order-item-3' },
      update: {},
      create: {
        id: 'order-item-3',
        orderId: order2.id,
        menuItemId: 'coffee-latte',
        quantity: 1,
        unitPrice: 5.25,
        totalPrice: 5.25,
        specialInstructions: 'Extra hot',
      },
    });
    
    await prisma.orderItem.upsert({
      where: { id: 'order-item-4' },
      update: {},
      create: {
        id: 'order-item-4',
        orderId: order2.id,
        menuItemId: 'coffee-croissant',
        quantity: 1,
        unitPrice: 3.25,
        totalPrice: 3.25,
      },
    });
    
    // Order 3: New sushi order
    const order3 = await prisma.order.upsert({
      where: { id: 'order-3' },
      update: {},
      create: {
        id: 'order-3',
        orderNumber: 'ORD-003-2024',
        customerId: customer1.id,
        storeId: sushiStore.id,
        status: 'NEW',
        subtotal: 32.97,
        deliveryFee: 3.99,
        tax: 2.64,
        total: 39.60,
        paymentMethod: 'CASH_ON_DELIVERY',
        deliveryAddress: '123 Customer Avenue, City, ST 12345',
        customerPhone: '+1-555-0301',
        estimatedDeliveryTime: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
      },
    });
    
    // Order items for order 3
    await prisma.orderItem.upsert({
      where: { id: 'order-item-5' },
      update: {},
      create: {
        id: 'order-item-5',
        orderId: order3.id,
        menuItemId: 'sushi-salmon-roll',
        quantity: 1,
        unitPrice: 12.99,
        totalPrice: 12.99,
      },
    });
    
    await prisma.orderItem.upsert({
      where: { id: 'order-item-6' },
      update: {},
      create: {
        id: 'order-item-6',
        orderId: order3.id,
        menuItemId: 'sushi-tuna-sashimi',
        quantity: 1,
        unitPrice: 18.99,
        totalPrice: 18.99,
      },
    });
    
    await prisma.orderItem.upsert({
      where: { id: 'order-item-7' },
      update: {},
      create: {
        id: 'order-item-7',
        orderId: order3.id,
        menuItemId: 'sushi-miso-soup',
        quantity: 1,
        unitPrice: 4.99,
        totalPrice: 4.99,
      },
    });
    
    console.log('✅ Sample orders created successfully');
    
    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   👥 Users: ${await prisma.user.count()}`);
    console.log(`   🏪 Stores: ${await prisma.store.count()}`);
    console.log(`   🍕 Menu Items: ${await prisma.menuItem.count()}`);
    console.log(`   📋 Orders: ${await prisma.order.count()}`);
    console.log(`   📦 Order Items: ${await prisma.orderItem.count()}`);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n💡 Test Accounts:');
    console.log('   Admin: admin@vibe.com / password123');
    console.log('   Store Owner: pizza.owner@vibe.com / password123');
    console.log('   Customer: john.doe@example.com / password123');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('💥 Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });