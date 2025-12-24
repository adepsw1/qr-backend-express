const express = require('express');
const router = express.Router();
const broadcastService = require('../services/broadcast.service');

// POST /api/broadcast - Create broadcast campaign
router.post('/', async (req, res, next) => {
  try {
    const { vendorId, offerId, name, customerIds, scheduleAt, message } = req.body;
    if (!vendorId || !offerId) {
      return res.status(400).json({ success: false, message: 'Vendor ID and offer ID required' });
    }

    const broadcast = await broadcastService.createBroadcast({
      vendorId,
      offerId,
      name,
      customerIds,
      scheduleAt,
      message,
    });
    res.status(201).json({ success: true, message: 'Broadcast campaign created', data: broadcast });
  } catch (err) {
    next(err);
  }
});

// GET /api/broadcast/:broadcastId
router.get('/:broadcastId', async (req, res, next) => {
  try {
    const broadcast = await broadcastService.getBroadcast(req.params.broadcastId);
    res.json({ success: true, data: broadcast });
  } catch (err) {
    next(err);
  }
});

// GET /api/broadcast - Get all broadcasts (with optional vendorId filter)
router.get('/', async (req, res, next) => {
  try {
    const { vendorId, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await broadcastService.getAllBroadcasts(vendorId, status, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcast/:broadcastId/execute - Execute broadcast
router.post('/:broadcastId/execute', async (req, res, next) => {
  try {
    const result = await broadcastService.executeBroadcast(req.params.broadcastId);
    res.json({
      success: true,
      message: 'Broadcast execution started',
      data: {
        broadcastId: req.params.broadcastId,
        status: result.status,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcast/:broadcastId/cancel
router.post('/:broadcastId/cancel', async (req, res, next) => {
  try {
    const result = await broadcastService.cancelBroadcast(req.params.broadcastId);
    res.json({ success: true, message: 'Broadcast cancelled', data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/broadcast/queue/status
router.get('/queue/status', async (req, res, next) => {
  try {
    const status = await broadcastService.getQueueStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcast/:broadcastId/retry-failed
router.post('/:broadcastId/retry-failed', async (req, res, next) => {
  try {
    const result = await broadcastService.retryFailedMessages(req.params.broadcastId);
    res.json({ success: true, message: 'Retry initiated for failed messages', data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
