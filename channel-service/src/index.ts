import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:5000';

app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`[CHANNEL-SIM] ${req.method} ${req.url}`);
  next();
});

interface SendMessageTask {
  communicationId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  message: string;
  channel: string;
}

/**
 * Fires receipts callback back to the CRM API with exponential backoff retry.
 */
async function sendReceiptCallback(communicationId: string, status: string, retryCount = 0): Promise<void> {
  const maxRetries = 3;
  try {
    const url = `${CRM_SERVICE_URL}/api/receipts`;
    console.log(`[CALLBACK] Sending receipt: ID=${communicationId}, Status=${status} to ${url} (Attempt ${retryCount + 1})`);
    
    await axios.post(url, {
      communicationId,
      status
    });
    
    console.log(`[CALLBACK-SUCCESS] Delivered receipt: ID=${communicationId}, Status=${status}`);
  } catch (error: any) {
    console.error(`[CALLBACK-ERROR] Failed to send receipt for ID=${communicationId}, Status=${status}:`, error.message);
    
    if (retryCount < maxRetries) {
      const backoffDelay = 2000 * Math.pow(2, retryCount); // 2s, 4s, 8s
      console.log(`[CALLBACK-RETRY] Retrying in ${backoffDelay}ms...`);
      setTimeout(() => {
        sendReceiptCallback(communicationId, status, retryCount + 1);
      }, backoffDelay);
    } else {
      console.error(`[CALLBACK-FATAL] Max retries reached. Dropping receipt callback for ID=${communicationId}, Status=${status}`);
    }
  }
}

/**
 * Simulates the lifecycle of a message delivery asynchronously.
 */
function processSimulation(task: SendMessageTask) {
  const { communicationId, customer, channel } = task;
  console.log(`[SIMULATOR] Starting delivery simulation for customer "${customer.name}" via [${channel}]`);

  // Step 1: Simulate DELIVERED vs FAILED (90% success rate)
  const isDelivered = Math.random() < 0.90;
  const deliveryDelay = Math.floor(Math.random() * 2000) + 1000; // 1 to 3 seconds

  setTimeout(async () => {
    if (!isDelivered) {
      console.log(`[SIMULATOR] Delivery FAILED for ${customer.name}`);
      await sendReceiptCallback(communicationId, 'FAILED');
      return; // Stop flow
    }

    console.log(`[SIMULATOR] Delivery SUCCEEDED for ${customer.name}`);
    await sendReceiptCallback(communicationId, 'DELIVERED');

    // Step 2: Simulate OPENED (75% open rate if delivered)
    const isOpen = Math.random() < 0.75;
    const openDelay = Math.floor(Math.random() * 3000) + 1500; // 1.5 to 4.5 seconds

    setTimeout(async () => {
      if (!isOpen) {
        return; // Stopped at delivered
      }

      console.log(`[SIMULATOR] Message OPENED by ${customer.name}`);
      await sendReceiptCallback(communicationId, 'OPENED');

      // Step 3: Simulate CLICKED (40% click rate if opened)
      const isClicked = Math.random() < 0.40;
      const clickDelay = Math.floor(Math.random() * 2500) + 1000; // 1 to 3.5 seconds

      setTimeout(async () => {
        if (!isClicked) {
          return; // Stopped at opened
        }

        console.log(`[SIMULATOR] Link CLICKED by ${customer.name}`);
        await sendReceiptCallback(communicationId, 'CLICKED');
      }, clickDelay);

    }, openDelay);

  }, deliveryDelay);
}

// Endpoint to queue message sending tasks
app.post('/api/send', (req, res) => {
  const { communicationId, customer, message, channel } = req.body;

  if (!communicationId || !customer || !message || !channel) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const task: SendMessageTask = {
    communicationId,
    customer,
    message,
    channel
  };

  // Process asynchronously without holding up the HTTP response
  processSimulation(task);

  return res.json({
    success: true,
    message: 'Message accepted and queued for delivery simulation'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'channel-service', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Channel Delivery Simulator running on port ${PORT}`);
});
