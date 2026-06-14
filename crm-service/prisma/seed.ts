import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create default admin user
  const adminEmail = 'admin@smartreach.ai';
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'SaaS Admin',
        email: adminEmail,
        passwordHash
      }
    });
    console.log('Admin user created (admin@smartreach.ai / admin123)');
  } else {
    console.log('Admin user already exists');
  }

  // 2. Create mock customers and orders
  const mockCustomers = [
    { name: 'Sarah Connor', email: 'sarah@skynet.com', phone: '+15550199', city: 'Los Angeles', age: 34 },
    { name: 'John Doe', email: 'john.doe@gmail.com', phone: '+15550123', city: 'New York', age: 28 },
    { name: 'Alice Smith', email: 'alice@yahoo.com', phone: '+15550145', city: 'San Francisco', age: 45 },
    { name: 'Bob Johnson', email: 'bob@gmail.com', phone: '+15550167', city: 'Chicago', age: 22 },
    { name: 'Elena Rostova', email: 'elena@mail.ru', phone: '+79991234', city: 'Moscow', age: 31 },
    { name: 'Carlos Santana', email: 'carlos@santana.org', phone: '+52555789', city: 'Mexico City', age: 65 },
    { name: 'Yuki Tanaka', email: 'yuki@company.co.jp', phone: '+81901234', city: 'Tokyo', age: 29 },
    { name: 'Liam Neeson', email: 'liam@taken.com', phone: '+44791199', city: 'London', age: 58 },
    { name: 'Emma Watson', email: 'emma@hogwarts.edu', phone: '+44791177', city: 'London', age: 33 },
    { name: 'David Beckham', email: 'david@galaxy.com', phone: '+15550111', city: 'Los Angeles', age: 48 }
  ];

  console.log(`Upserting ${mockCustomers.length} customers and their orders...`);

  for (const c of mockCustomers) {
    const customer = await prisma.customer.upsert({
      where: { email: c.email },
      update: {
        name: c.name,
        phone: c.phone,
        city: c.city,
        age: c.age
      },
      create: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        age: c.age
      }
    });

    // Delete existing orders to reset order state
    await prisma.order.deleteMany({
      where: { customerId: customer.id }
    });

    // Generate random orders
    const numOrders = Math.floor(Math.random() * 4) + 1; // 1 to 4 orders
    const ordersData = [];
    
    // Some high spenders, some low spenders
    const isHighSpender = ['Sarah Connor', 'Alice Smith', 'David Beckham'].includes(customer.name);

    for (let i = 0; i < numOrders; i++) {
      const amount = isHighSpender 
        ? Math.floor(Math.random() * 3000) + 1500  // $1500 - $4500 per order
        : Math.floor(Math.random() * 200) + 20;     // $20 - $220 per order
      
      // Order dates spread over the last 120 days
      const daysAgo = Math.floor(Math.random() * 120);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      ordersData.push({
        customerId: customer.id,
        amount,
        orderDate
      });
    }

    await prisma.order.createMany({
      data: ordersData
    });
  }

  // 3. Create a couple of default segments
  const segments = [
    {
      name: 'High Spenders (VIP)',
      description: 'Customers with orders greater than $1000',
      rules: { spend: { gt: 1000 } }
    },
    {
      name: 'Young Londoners',
      description: 'Customers aged under 35 living in London',
      rules: { age: { lt: 35 }, city: 'London' }
    },
    {
      name: 'Inactive Customers (90d)',
      description: 'Customers who have not purchased in the last 90 days',
      rules: { inactiveDays: 90 }
    }
  ];

  console.log(`Creating ${segments.length} default segments...`);
  for (const s of segments) {
    const existing = await prisma.segment.findFirst({
      where: { name: s.name }
    });
    if (!existing) {
      await prisma.segment.create({
        data: {
          name: s.name,
          description: s.description,
          rules: s.rules
        }
      });
    }
  }

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
