const { v4: uuidv4 } = require('uuid');
const hybridStorageService = require('./hybrid-storage.service');

class BroadcastService {
  async createBroadcast(data) {
    if (!data.offer_id || !Array.isArray(data.vendor_ids) || data.vendor_ids.length === 0) {
      throw { status: 400, message: 'Offer ID and vendor IDs required' };
    }

    const broadcastId = uuidv4();
    const broadcast = {
      id: broadcastId,
      offer_id: data.offer_id,
      vendor_ids: data.vendor_ids,
      message_template: data.message_template || 'Default message',
      status: 'created',
      total_vendors: data.vendor_ids.length,
      total_customers: 0,
      messages_sent: 0,
      messages_delivered: 0,
      messages_failed: 0,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };

    await hybridStorageService.setDocument('broadcasts', broadcastId, broadcast);
    return broadcast;
  }

  async executeBroadcast(broadcastId) {
    const broadcast = await hybridStorageService.getDocument('broadcasts', broadcastId);
    if (!broadcast) {
      throw { status: 404, message: `Broadcast ${broadcastId} not found` };
    }

    if (broadcast.status !== 'created') {
      throw { status: 400, message: 'Broadcast can only be executed from created status' };
    }

    const updated = { ...broadcast, status: 'queued', started_at: new Date().toISOString() };
    await hybridStorageService.updateDocument('broadcasts', broadcastId, updated);
    return updated;
  }

  async getBroadcast(broadcastId) {
    const broadcast = await hybridStorageService.getDocument('broadcasts', broadcastId);
    if (!broadcast) {
      throw { status: 404, message: `Broadcast ${broadcastId} not found` };
    }
    return broadcast;
  }

  async getAllBroadcasts(page = 1, limit = 20) {
    const allBroadcasts = await hybridStorageService.getCollection('broadcasts');
    const start = (page - 1) * limit;
    const end = start + limit;
    return { data: allBroadcasts.slice(start, end), total: allBroadcasts.length };
  }

  async cancelBroadcast(broadcastId) {
    const broadcast = await hybridStorageService.getDocument('broadcasts', broadcastId);
    if (!broadcast) {
      throw { status: 404, message: `Broadcast ${broadcastId} not found` };
    }

    if (['completed', 'failed'].includes(broadcast.status)) {
      throw { status: 400, message: 'Cannot cancel completed or failed broadcasts' };
    }

    const updated = { ...broadcast, status: 'cancelled' };
    await hybridStorageService.updateDocument('broadcasts', broadcastId, updated);
    return updated;
  }

  async getQueueStatus() {
    const messageQueue = await hybridStorageService.getCollection('broadcast_queue');
    return {
      pending: messageQueue.filter(m => m.status === 'pending').length,
      processing: messageQueue.filter(m => m.status === 'processing').length,
      completed: messageQueue.filter(m => m.status === 'completed').length,
      failed: messageQueue.filter(m => m.status === 'failed').length,
      total: messageQueue.length,
    };
  }

  async retryFailedMessages(broadcastId) {
    await this.getBroadcast(broadcastId);
    return { message: 'Retry initiated', count: 0 };
  }
}

module.exports = new BroadcastService();
