const { v4: uuidv4 } = require('uuid');
const firebaseService = require('./firebase.service');

class RedemptionService {
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async registerForOffer(data) {
    if (!data.vendorId || !data.name || !data.phoneNumber) {
      throw { status: 400, message: 'Vendor ID, name, and phone number are required' };
    }

    // Ensure customer record exists
    let customer = await firebaseService.getDocument('customers', data.phoneNumber);
    if (!customer) {
      const customerId = uuidv4();
      customer = {
        id: customerId,
        phone_number: data.phoneNumber,
        name: data.name || 'Customer',
        vendorId: data.vendorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await firebaseService.setDocument('customers', data.phoneNumber, customer);
    } else if (data.name && customer.name !== data.name) {
      customer.name = data.name;
      customer.vendorId = data.vendorId;
      customer.updated_at = new Date().toISOString();
      await firebaseService.updateDocument('customers', data.phoneNumber, customer);
    }

    // Check for existing unredeemed offer
    const existing = await firebaseService.queryCollection('redemptions', 'phoneNumber', '==', data.phoneNumber);
    const now = new Date();

    if (existing && existing.length > 0) {
      const match = existing.find(r => 
        r.vendorId === data.vendorId && 
        r.status === 'otp_generated' && 
        new Date(r.otpExpiresAt) > now
      );
      if (match) {
        return {
          sessionId: match.sessionId,
          redemptionId: match.id,
          message: 'You already have an active offer and OTP. Please redeem before requesting a new one.'
        };
      }
    }

    // Determine discount based on history
    const pastRedemptions = existing || [];
    let discount = 2;
    let offerTitle = '';
    let offerDescription = '';

    if (!pastRedemptions || pastRedemptions.length === 0) {
      discount = 10;
      offerTitle = 'Welcome Offer: 10% Off!';
      offerDescription = 'Enjoy 10% off on your first visit. Expires in 2 months.';
    } else {
      const sorted = pastRedemptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastRedemption = sorted[0];
      const lastDate = new Date(lastRedemption.createdAt);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        discount = 10;
        offerTitle = 'We Miss You! 10% Off';
        offerDescription = 'Come back and enjoy 10% off. Expires in 2 months.';
      } else if (diffDays > 7) {
        discount = 5;
        offerTitle = 'Thanks for Returning: 5% Off';
        offerDescription = 'Enjoy 5% off for being a returning customer. Expires in 2 months.';
      } else {
        discount = 2;
        offerTitle = 'Loyalty Offer: 2% Off';
        offerDescription = 'Thanks for being a regular! Enjoy 2% off. Expires in 2 months.';
      }
    }

    const otp = this.generateOTP();
    const sessionId = uuidv4();
    const redemptionId = uuidv4();

    const redemption = {
      id: redemptionId,
      sessionId,
      vendorId: data.vendorId,
      offerId: null,
      offerTitle,
      offerDescription,
      discountPercent: discount,
      customerName: data.name,
      phoneNumber: data.phoneNumber,
      otp,
      otpGeneratedAt: now.toISOString(),
      otpExpiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      offerExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'otp_generated',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await firebaseService.setDocument('redemptions', redemptionId, redemption);
    console.log(`[RedemptionService] ✅ OTP generated: ${data.phoneNumber}, Discount: ${discount}%, OTP: ${otp}`);

    return {
      sessionId,
      redemptionId,
      message: `OTP generated. You have received a ${discount}% discount offer. Valid for 2 months.`
    };
  }

  async getSessionDetails(sessionId) {
    const redemptions = await firebaseService.queryCollection('redemptions', 'sessionId', '==', sessionId);

    if (redemptions.length === 0) {
      throw { status: 404, message: 'Session not found' };
    }

    const redemption = redemptions[0];

    if (new Date() > new Date(redemption.otpExpiresAt)) {
      throw { status: 400, message: 'OTP has expired' };
    }

    return {
      otp: redemption.otp,
      offer: {
        title: redemption.offerTitle,
        description: redemption.offerDescription,
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      customerName: redemption.customerName,
      phoneNumber: redemption.phoneNumber,
    };
  }

  async verifyOtpForVendor(data) {
    if (!data.otp || !data.vendorId) {
      throw { status: 400, message: 'OTP and vendor ID are required' };
    }

    const redemptions = await firebaseService.queryCollection('redemptions', 'otp', '==', data.otp);

    if (redemptions.length === 0) {
      throw { status: 404, message: 'Invalid OTP' };
    }

    const redemption = redemptions[0];

    if (redemption.vendorId !== data.vendorId) {
      throw { status: 400, message: 'OTP does not belong to your vendor' };
    }

    if (new Date() > new Date(redemption.otpExpiresAt)) {
      throw { status: 400, message: 'OTP has expired' };
    }

    if (redemption.status === 'redeemed') {
      throw { status: 400, message: 'This offer has already been redeemed' };
    }

    return {
      redemptionId: redemption.id,
      customerName: redemption.customerName,
      phoneNumber: redemption.phoneNumber,
      offerTitle: redemption.offerTitle,
      offerDescription: redemption.offerDescription,
      offerExpiry: redemption.offerExpiresAt,
      status: 'valid',
    };
  }

  async confirmRedemption(data) {
    if (!data.redemptionId || !data.vendorId) {
      throw { status: 400, message: 'Redemption ID and vendor ID are required' };
    }

    const redemption = await firebaseService.getDocument('redemptions', data.redemptionId);

    if (!redemption) {
      throw { status: 404, message: 'Redemption record not found' };
    }

    if (redemption.vendorId !== data.vendorId) {
      throw { status: 400, message: 'Unauthorized to redeem this offer' };
    }

    if (redemption.status === 'redeemed') {
      throw { status: 400, message: 'Offer already redeemed' };
    }

    await firebaseService.updateDocument('redemptions', data.redemptionId, {
      status: 'redeemed',
      redeemedAt: new Date().toISOString(),
      redeemedByVendor: data.vendorId,
      updatedAt: new Date().toISOString(),
    });

    // Delete after redeem to cleanup
    await firebaseService.deleteDocument('redemptions', data.redemptionId);

    console.log(`[RedemptionService] ✅ Offer redeemed for: ${redemption.customerName}`);

    return {
      message: 'Offer redeemed successfully',
      customerName: redemption.customerName,
      offerTitle: redemption.offerTitle,
    };
  }

  async getVendorRedemptions(vendorId, page = 1, limit = 50) {
    const allRedemptions = await firebaseService.queryCollection('redemptions', 'vendorId', '==', vendorId);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: allRedemptions.slice(start, end),
      pagination: { page, limit, total: allRedemptions.length, pages: Math.ceil(allRedemptions.length / limit) }
    };
  }
}

module.exports = new RedemptionService();
