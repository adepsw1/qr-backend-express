const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    const result = await authService.sendOTP(phoneNumber);
    res.json({ success: true, message: 'OTP sent to your phone', sessionToken: result.sessionToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP required' });
    }

    if (otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'OTP must be 4 digits' });
    }

    const tokens = await authService.verifyOTP(phoneNumber, otp);
    res.json({
      success: true,
      message: 'OTP verified successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, userType } = req.body;
    if (!email || !password || !userType) {
      return res.status(400).json({ success: false, message: 'Email, password, and userType required' });
    }

    const result = await authService.loginWithPassword(email, password, userType);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.userId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ success: false, message: 'No token provided' });
    }

    await authService.logout(token);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
