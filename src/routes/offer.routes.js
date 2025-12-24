const express = require('express');
const router = express.Router();
const offerService = require('../services/offer.service');

// POST /api/offer - Create offer
router.post('/', async (req, res, next) => {
  try {
    const offer = await offerService.createOffer(req.body);
    res.status(201).json({ success: true, message: 'Offer created successfully', data: offer });
  } catch (err) {
    next(err);
  }
});

// GET /api/offer/:offerId
router.get('/:offerId', async (req, res, next) => {
  try {
    const offer = await offerService.getOffer(req.params.offerId);
    res.json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
});

// GET /api/offer - Get all offers
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const result = await offerService.getAllOffers(page, limit, status);
    res.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/offer/:offerId - Update offer
router.put('/:offerId', async (req, res, next) => {
  try {
    const offer = await offerService.updateOffer(req.params.offerId, req.body);
    res.json({ success: true, message: 'Offer updated successfully', data: offer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offer/:offerId
router.delete('/:offerId', async (req, res, next) => {
  try {
    await offerService.deleteOffer(req.params.offerId);
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/offer/:offerId/publish
router.post('/:offerId/publish', async (req, res, next) => {
  try {
    const { vendorIds } = req.body;
    if (!vendorIds || vendorIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one vendor must be selected' });
    }
    const offer = await offerService.publishOffer(req.params.offerId, vendorIds);
    res.json({ success: true, message: 'Offer published successfully', data: offer });
  } catch (err) {
    next(err);
  }
});

// GET /api/offer/vendor/:vendorId - Get offers for vendor
router.get('/vendor/:vendorId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const result = await offerService.getVendorOffers(req.params.vendorId, page, limit, status);
    res.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/offer/:offerId/vendor/:vendorId/accept
router.post('/:offerId/vendor/:vendorId/accept', async (req, res, next) => {
  try {
    const result = await offerService.vendorAcceptOffer(req.params.offerId, req.params.vendorId);
    res.json({ success: true, message: 'Offer accepted', data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/offer/:offerId/vendor/:vendorId/reject
router.post('/:offerId/vendor/:vendorId/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await offerService.vendorRejectOffer(req.params.offerId, req.params.vendorId, reason);
    res.json({ success: true, message: 'Offer rejected', data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/offer/:offerId/send-to-customers
router.post('/:offerId/send-to-customers', async (req, res, next) => {
  try {
    const { customerIds, vendorId } = req.body;
    const result = await offerService.sendOfferToCustomers(req.params.offerId, customerIds, vendorId);
    res.json({ success: true, message: 'Offer sent to customers', data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/offer/:offerId/analytics
router.get('/:offerId/analytics', async (req, res, next) => {
  try {
    const analytics = await offerService.getOfferAnalytics(req.params.offerId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
