import { Router, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import prisma from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { generateCampaignCopy, suggestCampaigns } from '../services/ai';
import { getCustomersMatchingRules } from './segments';

const router = Router();
const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';

const campaignCreateSchema = z.object({
  name: z.string().min(2, 'Campaign name must be at least 2 characters'),
  segmentId: z.string().uuid('Invalid segment ID'),
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'RCS']),
  message: z.string().min(1, 'Message is required')
});

// List all campaigns
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        segment: { select: { name: true } },
        _count: { select: { communications: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(campaigns);
  } catch (error) {
    console.error('Fetch campaigns error:', error);
    return res.status(500).json({ error: 'Internal server error fetching campaigns' });
  }
});

// Single campaign by ID with communication logs
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        segment: true,
        communications: {
          include: {
            customer: { select: { name: true, email: true, phone: true } },
            events: { orderBy: { createdAt: 'desc' } }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json(campaign);
  } catch (error) {
    console.error('Fetch campaign detail error:', error);
    return res.status(500).json({ error: 'Internal server error fetching campaign details' });
  }
});

// AI Copy Generation
router.post('/generate-copy', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campaignName, segmentName, channel, description } = req.body;
    if (!campaignName || !segmentName || !channel) {
      return res.status(400).json({ error: 'Missing required parameters: campaignName, segmentName, channel' });
    }

    const copy = await generateCampaignCopy(campaignName, segmentName, channel, description || '');
    return res.json({ copy });
  } catch (error) {
    console.error('Generate copy error:', error);
    return res.status(500).json({ error: 'Internal server error generating message copy' });
  }
});

// AI Suggestions
router.post('/suggest-campaigns', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { segmentId } = req.body;
    if (!segmentId) {
      return res.status(400).json({ error: 'segmentId is required' });
    }

    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const suggestions = await suggestCampaigns(segment.name, segment.description || '');
    return res.json(suggestions);
  } catch (error) {
    console.error('Suggest campaigns error:', error);
    return res.status(500).json({ error: 'Internal server error generating campaign suggestions' });
  }
});

// Create campaign
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = campaignCreateSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        segmentId: data.segmentId,
        channel: data.channel,
        message: data.message,
        status: 'DRAFT'
      }
    });

    return res.status(214).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create campaign error:', error);
    return res.status(500).json({ error: 'Internal server error creating campaign' });
  }
});

// Dispatch Campaign (Send)
router.post('/:id/send', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaignId = req.params.id;
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { segment: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'SENDING') {
      return res.status(400).json({ error: 'Campaign is already being sent' });
    }

    // Mark campaign status as SENDING
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' }
    });

    // Get matching customers in segment
    const targetCustomers = await getCustomersMatchingRules(campaign.segment.rules);

    if (targetCustomers.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'FAILED' }
      });
      return res.status(400).json({ error: 'No customers found matching the segment criteria' });
    }

    // Trigger asynchronous dispatch processing to avoid request block timeouts
    // We respond to client immediately with progress status, and process sending in background
    setTimeout(async () => {
      try {
        for (const customer of targetCustomers) {
          // 1. Personalize message template
          const personalizedMessage = campaign.message.replace(/\[Customer Name\]/gi, customer.name);

          // 2. Create Communication log in DB
          const comm = await prisma.communication.create({
            data: {
              campaignId: campaign.id,
              customerId: customer.id,
              status: 'SENT'
            }
          });

          // 3. Create initial Event
          await prisma.event.create({
            data: {
              communicationId: comm.id,
              eventType: 'SENT'
            }
          });

          // 4. Fire API call to simulator service
          try {
            await axios.post(`${CHANNEL_SERVICE_URL}/api/send`, {
              communicationId: comm.id,
              customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone
              },
              message: personalizedMessage,
              channel: campaign.channel
            });
          } catch (sendErr: any) {
            console.error(`Failed to forward communication ${comm.id} to channel simulator:`, sendErr.message);
            // Mark communication as FAILED since it couldn't be queued
            await prisma.communication.update({
              where: { id: comm.id },
              data: { status: 'FAILED' }
            });
            await prisma.event.create({
              data: {
                communicationId: comm.id,
                eventType: 'FAILED'
              }
            });
          }
        }

        // Set campaign status to completed once dispatched
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED' }
        });
      } catch (bgError) {
        console.error('Error in campaign dispatch loop background task:', bgError);
      }
    }, 0);

    return res.json({ message: 'Campaign sending initiated.', targetCount: targetCustomers.length });
  } catch (error) {
    console.error('Campaign dispatch error:', error);
    return res.status(500).json({ error: 'Internal server error sending campaign' });
  }
});

export default router;
