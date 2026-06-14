import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load Environment variables
dotenv.config();

import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import segmentRoutes from './routes/segments';
import campaignRoutes from './routes/campaigns';
import analyticsRoutes from './routes/analytics';

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors({
  origin: '*', // For evaluation simplicity, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Basic Request logger
app.use((req, res, next) => {
  console.log(`[CRM] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);

// Mount Analytics and Webhook Receipts Callback
app.use('/api/analytics', analyticsRoutes); // GET /api/analytics
app.use('/api', analyticsRoutes);            // POST /api/receipts

import prisma from './config/db';
import axios from 'axios';

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';

// Health check endpoint with database and channel-service connectivity check
const healthCheckHandler = async (req: express.Request, res: express.Response) => {
  let dbStatus = 'DISCONNECTED';
  let channelStatus = 'OFFLINE';
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'CONNECTED';
  } catch (err) {
    console.error('Database connection health check failed:', err);
  }

  try {
    const channelRes = await axios.get(`${CHANNEL_SERVICE_URL}/health`);
    if (channelRes.data?.status === 'healthy') {
      channelStatus = 'OPERATIONAL';
    }
  } catch (err) {
    console.error('Channel Simulator health check failed:', err);
  }

  const isHealthy = dbStatus === 'CONNECTED' && channelStatus === 'OPERATIONAL';

  res.json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'crm-service',
    timestamp: new Date(),
    db: dbStatus,
    channelService: channelStatus
  });
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[CRM Error Handler]:', err);
  res.status(500).json({ error: err.message || 'Internal server error occurred' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`SmartReach CRM Service running on port ${PORT}`);
});
