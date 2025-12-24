const express = require('express');
const router = express.Router();
const customerService = require('../services/customer.service');

// POST /api/customer/send-otp
router.post('/send-otp', async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    const result = await customerService.sendOTPToCustomer(phoneNumber);
    res.json({ success: true, message: 'OTP sent to your phone', sessionToken: result.sessionToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/customer/opt-in
router.post('/opt-in', async (req, res, next) => {
  try {
    const { phoneNumber, vendorId, source, name } = req.body;
    if (!phoneNumber || !vendorId || !source) {
      return res.status(400).json({ success: false, message: 'Phone number, vendor ID, and source required' });
    }

    const result = await customerService.optInCustomer({ phoneNumber, vendorId, source, name });
    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/customer/:customerId
router.get('/:customerId', async (req, res, next) => {
  try {
    const customer = await customerService.getCustomer(req.params.customerId);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customer/phone/:phoneNumber
router.get('/phone/:phoneNumber', async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByPhone(req.params.phoneNumber);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customer/:customerId/vendors
router.get('/:customerId/vendors', async (req, res, next) => {
  try {
    const customer = await customerService.getCustomer(req.params.customerId);
    const vendors = await customerService.getCustomerVendors(customer.phone_number);
    res.json({ success: true, data: vendors, count: vendors.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/customer/opt-out
router.post('/opt-out', async (req, res, next) => {
  try {
    const { phoneNumber, vendorId } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    const result = await customerService.optOutCustomer(phoneNumber, vendorId);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
});

// GET /api/customer/vendor/:vendorId/customers
router.get('/vendor/:vendorId/customers', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const result = await customerService.getVendorCustomers(req.params.vendorId, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
