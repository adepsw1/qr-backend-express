const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhook.service');

// GET /api/webhook/whatsapp - WhatsApp webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// POST /api/webhook/whatsapp - WhatsApp webhook events
router.post('/whatsapp', async (req, res, next) => {
  try {
    const body = req.body;

    // Log the incoming webhook
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Process webhook events
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Handle incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await webhookService.handleIncomingMessage(message, value.metadata);
              }
            }
            
            // Handle message status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                await webhookService.handleStatusUpdate(status);
              }
            }
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('Webhook error:', err);
    // Still return 200 to prevent retries
    res.status(200).send('EVENT_RECEIVED');
  }
});

// POST /api/webhook/events - Generic webhook events
router.post('/events', async (req, res, next) => {
  try {
    const { type, data } = req.body;
    
    if (!type) {
      return res.status(400).json({ success: false, message: 'Event type required' });
    }

    const result = await webhookService.processEvent(type, data);
    res.json({ success: true, message: 'Event processed', data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhook/opt-out - Handle opt-out requests from WhatsApp
router.post('/opt-out', async (req, res, next) => {
  try {
    const { phoneNumber, vendorId, reason } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    const result = await webhookService.handleOptOut(phoneNumber, vendorId, reason);
    res.json({ success: true, message: 'Opt-out processed', data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/webhook/health - Webhook health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
