const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const firebaseService = require('./firebase.service');

class VendorService {
  async registerVendor(data) {
    if (!data.name || !data.email || !data.phone_number || !data.password || !data.address) {
      throw { status: 400, message: 'All fields required' };
    }

    const existingByEmail = await firebaseService.queryCollection('vendors', 'email', '==', data.email);
    if (existingByEmail.length > 0) {
      throw { status: 400, message: 'Vendor with this email already exists' };
    }

    const vendorId = uuidv4();
    const qrCodeUrl = await this.generateQRCode(vendorId);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // MINIMAL vendor data - only essential fields
    const vendor = {
      id: vendorId,
      name: data.name,
      email: data.email,
      phone: data.phone_number,
      password: hashedPassword,
      address: data.address,
      qr_code_url: qrCodeUrl,
      created_at: new Date().toISOString(),
    };

    await firebaseService.setDocument('vendors', vendorId, vendor);
    console.log('[VendorService] ✅ Vendor registered:', vendorId);

    return {
      id: vendor.id,
      name: vendor.name,
      qr_code_url: vendor.qr_code_url,
    };
  }

  async getVendor(vendorId) {
    const vendor = await firebaseService.getDocument('vendors', vendorId);
    if (!vendor) {
      throw { status: 404, message: `Vendor ${vendorId} not found` };
    }
    return vendor;
  }

  async updateVendor(vendorId, data) {
    const vendor = await firebaseService.getDocument('vendors', vendorId);
    if (!vendor) {
      throw { status: 404, message: `Vendor ${vendorId} not found` };
    }

    const updated = { ...data, updated_at: new Date().toISOString() };
    await firebaseService.updateDocument('vendors', vendorId, updated);
    return { ...vendor, ...updated };
  }

  async getAllVendors(page = 1, limit = 20) {
    const allVendors = await firebaseService.getCollection('vendors');
    console.log('[VendorService] 📋 Fetching vendors - Total:', allVendors.length);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: allVendors.slice(start, end),
      total: allVendors.length,
    };
  }

  async deleteVendor(vendorId) {
    const vendor = await firebaseService.getDocument('vendors', vendorId);
    if (!vendor) {
      throw { status: 404, message: `Vendor ${vendorId} not found` };
    }
    await firebaseService.deleteDocument('vendors', vendorId);
  }

  async generateQRCode(vendorId) {
    try {
      const qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/offer/${vendorId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);
      console.log(`[VendorService] ✅ Generated QR code for vendor ${vendorId}`);
      return qrCodeDataUrl;
    } catch (error) {
      throw { status: 400, message: 'Failed to generate QR code' };
    }
  }

  async getPendingOffers(vendorId, page = 1, limit = 10) {
    const allOffers = await firebaseService.queryCollection('vendor_offer_actions', 'vendor_id', '==', vendorId);
    const pendingOffers = allOffers.filter(o => o.status === 'pending');
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: pendingOffers.slice(start, end),
      total: pendingOffers.length,
      page,
      limit,
    };
  }

  async getVendorStats(vendorId) {
    const offers = await firebaseService.queryCollection('vendor_offer_actions', 'vendor_id', '==', vendorId);
    const accepted = offers.filter(o => o.status === 'accepted').length;
    const rejected = offers.filter(o => o.status === 'rejected').length;
    const pending = offers.filter(o => o.status === 'pending').length;

    // Get redemption stats
    const redemptions = await firebaseService.queryCollection('redemptions', 'vendorId', '==', vendorId);
    const redeemedCount = redemptions.filter(r => r.status === 'redeemed').length;

    return { 
      accepted_offers: accepted, 
      pending_offers: pending,
      rejected_offers: rejected,
      total_offers: offers.length,
      total_redemptions: redeemedCount,
      total_messages_sent: 0, // TODO: Track from broadcast service
      delivery_rate: 0,
    };
  }
}

module.exports = new VendorService();
