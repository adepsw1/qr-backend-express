const express = require('express');
const router = express.Router();
const vendorService = require('../services/vendor.service');

// POST /api/vendor/register
router.post('/register', async (req, res, next) => {
  try {
    const { businessName, email, phone, password, address } = req.body;
    if (!businessName || !email || !phone || !password || !address) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const vendor = await vendorService.registerVendor({
      name: businessName,
      email,
      phone_number: phone,
      password,
      address,
    });

    res.json({ success: true, message: 'Vendor registered successfully', data: vendor });
  } catch (err) {
    next(err);
  }
});

// GET /api/vendor/:vendorId
router.get('/:vendorId', async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendor(req.params.vendorId);
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

// PUT /api/vendor/:vendorId
router.put('/:vendorId', async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.vendorId, req.body);
    res.json({ success: true, message: 'Vendor updated successfully', data: vendor });
  } catch (err) {
    next(err);
  }
});

// GET /api/vendor
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await vendorService.getAllVendors(page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vendor/:vendorId
router.delete('/:vendorId', async (req, res, next) => {
  try {
    await vendorService.deleteVendor(req.params.vendorId);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/vendor/:vendorId/pending-offers
router.get('/:vendorId/pending-offers', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await vendorService.getPendingOffers(req.params.vendorId, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/vendor/:vendorId/stats
router.get('/:vendorId/stats', async (req, res, next) => {
  try {
    const stats = await vendorService.getVendorStats(req.params.vendorId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// POST /api/vendor/:vendorId/regenerate-qr
router.post('/:vendorId/regenerate-qr', async (req, res, next) => {
  try {
    const qrCodeUrl = await vendorService.generateQRCode(req.params.vendorId);
    await vendorService.updateVendor(req.params.vendorId, { qr_code_url: qrCodeUrl });
    res.json({ success: true, message: 'QR code regenerated successfully', data: { qr_code_url: qrCodeUrl } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
