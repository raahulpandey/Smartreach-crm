import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const customerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Invalid phone number'),
  city: z.string().min(1, 'City is required'),
  age: z.coerce.number().int().positive('Age must be a positive integer')
});

// CSV parser supporting quoted text
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const results: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));

    if (values.length >= headers.length) {
      const obj: Record<string, string> = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      results.push(obj);
    }
  }
  return results;
}

// Get and filter customers
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, city, minAge, maxAge, minSpend, inactiveDays } = req.query;

    // Build filters for Prisma query
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (city) {
      whereClause.city = { equals: String(city), mode: 'insensitive' };
    }

    if (minAge || maxAge) {
      whereClause.age = {};
      if (minAge) whereClause.age.gte = parseInt(String(minAge), 10);
      if (maxAge) whereClause.age.lte = parseInt(String(maxAge), 10);
    }

    // Fetch customers with orders
    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        orders: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute aggregated metrics in JS for clean, portable code
    let results = customers.map(customer => {
      const totalSpend = customer.orders.reduce((sum, order) => sum + order.amount, 0);
      const orderCount = customer.orders.length;
      
      let lastOrderDate: Date | null = null;
      if (customer.orders.length > 0) {
        lastOrderDate = new Date(
          Math.max(...customer.orders.map(o => o.orderDate.getTime()))
        );
      }

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        age: customer.age,
        createdAt: customer.createdAt,
        totalSpend,
        orderCount,
        lastOrderDate
      };
    });

    // In-memory filter for computed values: minSpend
    if (minSpend) {
      const spendLimit = parseFloat(String(minSpend));
      results = results.filter(r => r.totalSpend >= spendLimit);
    }

    // In-memory filter for inactivity
    if (inactiveDays) {
      const days = parseInt(String(inactiveDays), 10);
      const cutOffDate = new Date();
      cutOffDate.setDate(cutOffDate.getDate() - days);

      results = results.filter(r => {
        // Customer is inactive if they have no order, or if their last order is older than cutOffDate
        if (!r.lastOrderDate) return true;
        return r.lastOrderDate < cutOffDate;
      });
    }

    return res.json(results);
  } catch (error) {
    console.error('Fetch customers error:', error);
    return res.status(500).json({ error: 'Internal server error fetching customers' });
  }
});

// Create single customer
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = customerCreateSchema.parse(req.body);

    const existingCustomer = await prisma.customer.findUnique({ where: { email: data.email } });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this email already exists' });
    }

    const customer = await prisma.customer.create({
      data
    });

    return res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create customer error:', error);
    return res.status(500).json({ error: 'Internal server error creating customer' });
  }
});

// CSV Import Customers
router.post('/import', authenticateJWT, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsedData = parseCSV(csvContent);

    if (parsedData.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or headers are missing' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Import sequential upserts to avoid primary key conflicts
    for (const row of parsedData) {
      try {
        const name = row.name || row.Name;
        const email = row.email || row.Email;
        const phone = row.phone || row.Phone;
        const city = row.city || row.City;
        const ageRaw = row.age || row.Age;

        if (!name || !email || !phone || !city || !ageRaw) {
          throw new Error(`Missing fields for customer: ${email || 'unknown'}`);
        }

        const age = parseInt(ageRaw, 10);
        if (isNaN(age)) {
          throw new Error(`Invalid age value: ${ageRaw}`);
        }

        await prisma.customer.upsert({
          where: { email },
          update: {
            name,
            phone,
            city,
            age
          },
          create: {
            name,
            email,
            phone,
            city,
            age
          }
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(err.message);
      }
    }

    return res.json({
      message: `Import completed. Successful: ${successCount}, Failed: ${errorCount}`,
      successCount,
      errorCount,
      errors
    });
  } catch (error) {
    console.error('Import CSV error:', error);
    return res.status(500).json({ error: 'Internal server error processing CSV import' });
  }
});

export default router;
