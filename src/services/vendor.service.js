const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const firebaseService = require('./firebase.service');
const qrService = require('./qr.service');

class VendorService {
  async registerVendor(data) {
    if (!data.name || !data.email || !data.phone_number || !data.password || !data.address) {
      throw { status: 400, message: 'All fields required' };
    }

    // Optional fields with defaults
    const city = data.city || '';
    const category = data.category || 'general';
    const qrToken = data.qrToken || null;

    // If QR token provided, validate and claim it
    let claimedQRData = null;
    if (qrToken) {
      try {
        await qrService.validateQRToken(qrToken);
      } catch (error) {
        throw error;
      }
    }

    const existingByEmail = await firebaseService.queryCollection('vendors', 'email', '==', data.email);
    if (existingByEmail.length > 0) {
      throw { status: 400, message: 'Vendor with this email already exists' };
    }

    const vendorId = uuidv4();
    
    // If QR token exists, use its image instead of generating a new one
    let qrCodeUrl = null;
    if (qrToken) {
      try {
        const qrTokenData = await firebaseService.getDocument('qr_tokens', qrToken);
        qrCodeUrl = qrTokenData.qr_image; // Use pre-generated QR image
        claimedQRData = qrTokenData;
      } catch (err) {
        console.warn('[VendorService] ⚠️ Could not get QR token data:', err.message);
      }
    }
    
    // Fallback: generate new QR if no QR token or if QR image not found
    if (!qrCodeUrl) {
      qrCodeUrl = await this.generateQRCode(vendorId);
    }

    // Generate slug from vendor name
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')  // Remove special characters
        .replace(/\s+/g, '-')       // Replace spaces with hyphens
        .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
    };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create vendor record with all fields
    const vendor = {
      id: vendorId,
      name: data.name,
      email: data.email,
      phone: data.phone_number,
      password: hashedPassword,
      address: data.address,
      city,
      category,
      qr_code_url: qrCodeUrl,
      qr_token: qrToken, // Store reference to QR token that was claimed
      qr_layout: claimedQRData?.layout || 'blue', // Store layout for later editing
      slug: generateSlug(data.name),
      created_at: new Date().toISOString(),
    };

    // Claim QR token if provided - DO THIS BEFORE SAVING VENDOR
    if (qrToken) {
      try {
        await qrService.claimQRToken(qrToken, vendorId);
        console.log(`[VendorService] ✅ Claimed QR token ${qrToken} for vendor ${vendorId}`);
        
        // Update QR to point directly to vendor storefront
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'https://mintcream-chinchilla-207752.hostingsite.com';
          const qrUpdate = await qrService.regenerateQRForStorefront(qrToken, vendorId, frontendUrl);
          vendor.qr_code_url = qrUpdate.qr_image; // Update vendor's QR with new image pointing to storefront
          console.log(`[VendorService] ✅ Updated QR to point directly to vendor storefront`);
        } catch (err) {
          console.warn('[VendorService] ⚠️ Could not update QR storefront link:', err.message);
        }
      } catch (error) {
        console.error(`[VendorService] ⚠️ Failed to claim QR token:`, error.message);
        // Don't fail registration if token claim fails
      }
    }

    // NOW SAVE VENDOR WITH UPDATED QR URL
    await firebaseService.setDocument('vendors', vendorId, vendor);

    // Generate JWT access token for auto-login
    const accessToken = jwt.sign(
      { vendorId, email: vendor.email, type: 'vendor-access' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[VendorService] ✅ Vendor registered:', vendorId);

    return {
      success: true,
      id: vendor.id,
      name: vendor.name,
      qr_code_url: vendor.qr_code_url,
      qr_token: vendor.qr_token,
      qr_layout: vendor.qr_layout,
      accessToken, // Return token for auto-login
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
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not set in environment variables');
      }

      const qrCodeUrl = `${process.env.FRONTEND_URL}/offer/${vendorId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

      console.log(`[VendorService] ✅ Generated QR code for vendor ${vendorId} → ${qrCodeUrl}`);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('[VendorService] ❌ QR generation failed:', error.message);
      throw { status: 400, message: 'Failed to generate QR code: ' + error.message };
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


