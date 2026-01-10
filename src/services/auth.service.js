const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const hybridStorageService = require('./hybrid-storage.service');

class AuthService {
  generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async sendOTP(phoneNumber) {
    const otp = this.generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await hybridStorageService.setDocument('otp_verifications', phoneNumber, {
      code: otp,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);

    const sessionToken = jwt.sign(
      { phone: phoneNumber, type: 'otp-session' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return { sessionToken };
  }

  async verifyOTP(phoneNumber, otp) {
    const stored = await hybridStorageService.getDocument('otp_verifications', phoneNumber);

    if (!stored) {
      throw { status: 400, message: 'OTP expired or not found' };
    }

    if (Date.now() > stored.expiresAt) {
      await hybridStorageService.deleteDocument('otp_verifications', phoneNumber);
      throw { status: 400, message: 'OTP expired' };
    }

    if (stored.code !== otp) {
      throw { status: 401, message: 'Invalid OTP' };
    }

    await hybridStorageService.deleteDocument('otp_verifications', phoneNumber);

    const accessToken = jwt.sign(
      { phone: phoneNumber, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { phone: phoneNumber, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  async loginWithPassword(email, password, userType) {
    if (userType === 'vendor') {
      const vendors = await hybridStorageService.queryCollection('vendors', 'email', '==', email);

      if (vendors.length === 0) {
        throw { status: 401, message: 'Invalid email or password' };
      }

      const vendor = vendors[0];
      const passwordMatch = await bcrypt.compare(password, vendor.password);

      if (!passwordMatch) {
        throw { status: 401, message: 'Invalid email or password' };
      }

      const userId = vendor.id;
      const accessToken = jwt.sign(
        { email, type: 'access', userType, userId, vendorId: vendor.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { email, type: 'refresh', userType, userId, vendorId: vendor.id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log('[AuthService] ✅ Vendor login successful:', vendor.id, email);
      return { accessToken, refreshToken, userId };
    } else if (userType === 'admin') {
      const adminEmail = 'admin@test.com';
      const adminPassword = 'password123';

      if (email !== adminEmail || password !== adminPassword) {
        throw { status: 401, message: 'Invalid admin credentials' };
      }

      const userId = 'admin-1';
      const accessToken = jwt.sign(
        { email, type: 'access', userType, userId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { email, type: 'refresh', userType, userId },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log('[AuthService] ✅ Admin login successful');
      return { accessToken, refreshToken, userId };
    }

    throw { status: 401, message: 'Invalid user type' };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        throw { status: 401, message: 'Invalid token type' };
      }

      const accessToken = jwt.sign(
        { phone: decoded.phone, email: decoded.email, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return { accessToken };
    } catch (error) {
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }
  }

  async logout(token) {
    // In production, add token to blacklist
    return { success: true };
  }
}

module.exports = new AuthService();
