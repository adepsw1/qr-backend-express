const express = require('express');
const router = express.Router();
const qrService = require('../services/qr.service');

// POST /api/qr/generate-batch - Generate N pre-generated QR tokens
router.post('/generate-batch', async (req, res, next) => {
  try {
    const { count, layout } = req.body;
    
    if (!count || count < 1 || count > 500) {
      return res.status(400).json({ 
        success: false, 
        message: 'Count must be between 1 and 500' 
      });
    }

    const result = await qrService.generateBatchQRTokens(count, layout || 'blue');
    res.json({ 
      success: true, 
      message: `Generated ${result.generated} QR tokens`,
      data: result 
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/qr/validate/:token - Validate if token exists and is unclaimed
router.get('/validate/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await qrService.validateQRToken(token);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/qr/:token/claim - Claim QR token for vendor during registration
router.post('/:token/claim', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor ID is required' 
      });
    }

    const result = await qrService.claimQRToken(token, vendorId);
    res.json({ 
      success: true, 
      message: 'QR token claimed successfully',
      data: result 
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/qr - Get all QR tokens (admin)
// GET /api/qr - Get all QR tokens (admin)
router.get('/', async (req, res, next) => {
  // TODO: Add auth middleware here
  // const token = req.headers.authorization?.split(' ')[1];
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status || null;

    const result = await qrService.getAllQRTokens(page, limit, status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/qr/:token - Get QR token details
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const qrToken = await qrService.getQRToken(token);
    res.json({ success: true, data: qrToken });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/qr/:token - Delete QR token (admin)
router.delete('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    await qrService.deleteQRToken(token);
    res.json({ success: true, message: 'QR token deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

