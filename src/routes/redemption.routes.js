const express = require('express');
const router = express.Router();
const redemptionService = require('../services/redemption.service');

// POST /api/redemption/register - Customer registers for offer (scans QR)
router.post('/register', async (req, res, next) => {
  try {
    const { vendorId, name, phoneNumber } = req.body;
    if (!vendorId || !name || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Vendor ID, name, and phone number required' });
    }

    const result = await redemptionService.registerForOffer({ vendorId, name, phoneNumber });
    res.json({
      success: true,
      message: result.message,
      data: {
        sessionId: result.sessionId,
        redemptionId: result.redemptionId,
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/redemption/generate-otp - Generate OTP for customer (frontend calls this)
router.post('/generate-otp', async (req, res, next) => {
  try {
    const { customerName, phoneNumber, vendorId, offerId } = req.body;
    if (!vendorId || !customerName || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Vendor ID, customer name, and phone number required' });
    }

    const result = await redemptionService.registerForOffer({ 
      vendorId, 
      name: customerName, 
      phoneNumber,
      offerId 
    });
    
    res.json({
      success: true,
      message: result.message || 'OTP generated successfully',
      data: {
        otp: result.otp,
        sessionId: result.sessionId,
        redemptionId: result.redemptionId,
        offerTitle: result.offerTitle,
        discountPercent: result.discountPercent,
      },
      otp: result.otp // Also at root level for backward compatibility
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/redemption/session/:sessionId - Get session details (OTP + offer info)
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const session = await redemptionService.getSessionDetails(req.params.sessionId);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// POST /api/redemption/verify-otp-for-vendor - Vendor verifies OTP
router.post('/verify-otp-for-vendor', async (req, res, next) => {
  try {
    const { otp, vendorId } = req.body;
    if (!otp || !vendorId) {
      return res.status(400).json({ success: false, message: 'OTP and vendor ID required' });
    }

    const result = await redemptionService.verifyOtpForVendor({ otp, vendorId });
    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/redemption/confirm - Vendor confirms redemption
router.post('/confirm', async (req, res, next) => {
  try {
    const { redemptionId, vendorId } = req.body;
    if (!redemptionId || !vendorId) {
      return res.status(400).json({ success: false, message: 'Redemption ID and vendor ID required' });
    }

    const result = await redemptionService.confirmRedemption({ redemptionId, vendorId });
    res.json({
      success: true,
      message: result.message,
      customerName: result.customerName,
      offerTitle: result.offerTitle,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/redemption/vendor/:vendorId/history - Get vendor redemption history
router.get('/vendor/:vendorId/history', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const result = await redemptionService.getVendorRedemptions(req.params.vendorId, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
