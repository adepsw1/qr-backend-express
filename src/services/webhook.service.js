const crypto = require('crypto');
const firebaseService = require('./firebase.service');

class WebhookService {
  acknowledgeWebhook(challenge) {
    return challenge ? parseInt(challenge) : { status: 'received' };
  }

  verifyWhatsAppWebhook(payload, signature) {
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  async handleMessageStatusUpdate(body) {
    console.log('[Webhook] Message status update:', JSON.stringify(body).slice(0, 200));
  }

  async handleIncomingMessage(value) {
    if (value.messages && value.messages.length > 0) {
      for (const message of value.messages) {
        console.log('[Webhook] Incoming message from:', message.from);

        if (message.text?.body?.toUpperCase() === 'STOP') {
          await this.handleOptOut(message.from);
        }
      }
    }
  }

  async getRecentEvents(limit = 100) {
    const events = await firebaseService.getCollection('webhook_events');
    return events.slice(0, limit);
  }

  async handleOptOut(phoneNumber, vendorId) {
    const optInRecords = await firebaseService.queryCollection('customer_optins', 'phone_number', '==', phoneNumber);

    if (vendorId) {
      const record = optInRecords.find(r => r.vendor_id === vendorId);
      if (record) {
        await firebaseService.updateDocument('customer_optins', record.id, {
          opt_in: false,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      for (const record of optInRecords) {
        await firebaseService.updateDocument('customer_optins', record.id, {
          opt_in: false,
          updated_at: new Date().toISOString(),
        });
      }
    }

    console.log('[Webhook] ✅ Opt-out processed for:', phoneNumber);
  }
}

module.exports = new WebhookService();
