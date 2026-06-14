import { Router, Response, Request } from 'express';
import prisma from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * RECEIPT CALLBACK (Unauthenticated local endpoint for the simulator)
 * POST /api/receipts
 * Body: { communicationId, status }
 */
router.post('/receipts', async (req: Request, res: Response) => {
  try {
    const { communicationId, status } = req.body;

    if (!communicationId || !status) {
      return res.status(400).json({ error: 'Missing communicationId or status' });
    }

    // Find the communication record
    const communication = await prisma.communication.findUnique({
      where: { id: communicationId },
      include: { customer: true }
    });

    if (!communication) {
      return res.status(404).json({ error: 'Communication log not found' });
    }

    // Update the communication status in DB
    const updatedComm = await prisma.communication.update({
      where: { id: communicationId },
      data: { status }
    });

    // Create tracking Event log
    await prisma.event.create({
      data: {
        communicationId,
        eventType: status
      }
    });

    // Simulating Conversions
    // If the message is CLICKED, we simulate a 35% chance that the user purchases (CONVERTED)
    if (status === 'CLICKED') {
      const isConverted = Math.random() < 0.35;
      
      if (isConverted) {
        // 1. Create a CONVERTED event
        await prisma.event.create({
          data: {
            communicationId,
            eventType: 'CONVERTED'
          }
        });

        // 2. Generate a purchase order in the database for the customer
        const amount = Math.floor(Math.random() * 180) + 20; // $20 to $200
        await prisma.order.create({
          data: {
            customerId: communication.customerId,
            amount,
            orderDate: new Date()
          }
        });

        console.log(`[CONVERSION] Communication ${communicationId} for customer ${communication.customer.name} converted! Purchase amount: $${amount}`);
      }
    }

    return res.json({ success: true, updatedStatus: updatedComm.status });
  } catch (error) {
    console.error('Process receipt callback error:', error);
    return res.status(500).json({ error: 'Internal server error processing receipt' });
  }
});

/**
 * GET ANALYTICS OVERVIEWS
 * GET /api/analytics
 */
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Core aggregates
    const totalCustomers = await prisma.customer.count();
    const orders = await prisma.order.findMany();
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

    // 2. Gather all communication statuses
    const communications = await prisma.communication.findMany({
      select: { status: true }
    });

    const counts = {
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
      converted: 0
    };

    // Note: status represents the current HIGHEST state.
    // However, events log every state transition. Let's count totals from Event model.
    const events = await prisma.event.findMany({
      select: { eventType: true }
    });

    events.forEach(e => {
      const type = e.eventType.toLowerCase();
      if (type in counts) {
        counts[type as keyof typeof counts]++;
      }
    });

    const totalCampaigns = await prisma.campaign.count();

    // 3. Campaign Performance Comparison
    const campaigns = await prisma.campaign.findMany({
      include: {
        segment: { select: { name: true } },
        communications: {
          include: {
            events: true
          }
        }
      }
    });

    const campaignPerformance = campaigns.map(camp => {
      const comms = camp.communications;
      const totalSent = comms.length;

      let delivered = 0;
      let failed = 0;
      let opened = 0;
      let clicked = 0;
      let converted = 0;

      comms.forEach(c => {
        const types = c.events.map(ev => ev.eventType);
        if (types.includes('DELIVERED')) delivered++;
        if (types.includes('FAILED')) failed++;
        if (types.includes('OPENED')) opened++;
        if (types.includes('CLICKED')) clicked++;
        if (types.includes('CONVERTED')) converted++;
      });

      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
      const conversionRate = clicked > 0 ? (converted / clicked) * 100 : 0;

      return {
        id: camp.id,
        name: camp.name,
        channel: camp.channel,
        segment: camp.segment.name,
        status: camp.status,
        sent: totalSent,
        delivered,
        failed,
        opened,
        clicked,
        converted,
        rates: {
          deliveryRate: Math.round(deliveryRate),
          openRate: Math.round(openRate),
          clickRate: Math.round(clickRate),
          conversionRate: Math.round(conversionRate)
        }
      };
    });

    // 4. Conversion graph over time (last 7 days grouped by day)
    // Build days array for last 7 days
    const conversionGraph: { date: string; conversions: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const dayRevenue = orders
        .filter(o => o.orderDate >= startOfDay && o.orderDate <= endOfDay)
        .reduce((sum, o) => sum + o.amount, 0);

      // Conversions are CONVERTED events created on that day
      const dayConversions = await prisma.event.count({
        where: {
          eventType: 'CONVERTED',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      conversionGraph.push({
        date: dateStr,
        conversions: dayConversions,
        revenue: Math.round(dayRevenue)
      });
    }

    return res.json({
      overview: {
        totalCustomers,
        totalRevenue: Math.round(totalRevenue),
        totalCampaigns,
        counts,
        deliveryRate: counts.sent > 0 ? Math.round((counts.delivered / counts.sent) * 100) : 0
      },
      campaignPerformance,
      conversionGraph
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    return res.status(500).json({ error: 'Internal server error loading analytics' });
  }
});

export default router;
