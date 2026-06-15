import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { parseSegmentPrompt } from '../services/ai';

const router = Router();

const segmentCreateSchema = z.object({
  name: z.string().min(2, 'Segment name must be at least 2 characters'),
  description: z.string().optional(),
  rules: z.any() // Structured rules object
});

/**
 * Filter customers dynamically based on segment rules
 */
export async function getCustomersMatchingRules(rules: any) {
  const customers = await prisma.customer.findMany({
    include: {
      orders: true
    }
  });

  return customers.filter(customer => {
    // 1. Age check
    if (rules.age) {
      if (rules.age.gt !== undefined && customer.age <= rules.age.gt) return false;
      if (rules.age.lt !== undefined && customer.age >= rules.age.lt) return false;
    }

    // 2. City check
    if (rules.city) {
      if (customer.city.toLowerCase() !== rules.city.toLowerCase()) return false;
    }

    // 3. Spend check
    if (rules.spend) {
      const totalSpend = customer.orders.reduce((sum, o) => sum + o.amount, 0);
      if (rules.spend.gt !== undefined && totalSpend <= rules.spend.gt) return false;
      if (rules.spend.lt !== undefined && totalSpend >= rules.spend.lt) return false;
    }

    // 4. Inactivity check
    if (rules.inactiveDays !== undefined) {
      if (customer.orders.length === 0) {
        return true; // No orders: always inactive
      }
      const lastOrderDate = new Date(Math.max(...customer.orders.map(o => o.orderDate.getTime())));
      const diffTime = Math.abs(new Date().getTime() - lastOrderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < rules.inactiveDays) return false;
    }

    return true;
  });
}

// Get all segments
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(segments);
  } catch (error) {
    console.error('Fetch segments error:', error);
    return res.status(500).json({ error: 'Internal server error fetching segments' });
  }
});

// AI Parse natural language prompt
router.post('/parse', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    const result = await parseSegmentPrompt(prompt);
    
    // Evaluate how many customers match this rule in real-time
    const matchingCustomers = await getCustomersMatchingRules(result.rules);

    return res.json({
      ...result,
      matchCount: matchingCustomers.length
    });
  } catch (error) {
    console.error('Parse prompt error:', error);
    return res.status(500).json({ error: 'Internal server error parsing prompt' });
  }
});

// Create segment
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, rules } = segmentCreateSchema.parse(req.body);

    const segment = await prisma.segment.create({
      data: {
        name,
        description,
        rules
      }
    });

    return res.status(201).json(segment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create segment error:', error);
    return res.status(500).json({ error: 'Internal server error creating segment' });
  }
});

// Get customers matching a specific segment
router.get('/:id/customers', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const segment = await prisma.segment.findUnique({
      where: { id: req.params.id }
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const customers = await getCustomersMatchingRules(segment.rules);
    
    // Format response to exclude full order histories for layout speeds
    const formattedCustomers = customers.map(c => {
      const totalSpend = c.orders.reduce((sum, o) => sum + o.amount, 0);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        age: c.age,
        totalSpend
      };
    });

    return res.json(formattedCustomers);
  } catch (error) {
    console.error('Fetch segment customers error:', error);
    return res.status(500).json({ error: 'Internal server error fetching segment customers' });
  }
});

export default router;
