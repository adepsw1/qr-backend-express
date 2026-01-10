const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const firebaseService = require('./firebase.service');

class QRService {
  /**
   * Generate batch of pre-generated QR tokens
   * Each QR token is unique and can be claimed by vendors during registration
   */
  async generateBatchQRTokens(count, layout = 'blue') {
    const tokens = [];
    const frontendUrl = process.env.FRONTEND_URL || 'https://mintcream-chinchilla-207752.hostingersite.com';
    
    for (let i = 0; i < count; i++) {
      try {
        // Generate unique token like QR_ABC123XYZ
        const token = `QR_${uuidv4().substring(0, 8).toUpperCase()}${uuidv4().substring(0, 3).toUpperCase()}`;
        
        // Generate QR code that directly redirects to vendor storefront
        const qrRedirectUrl = `${frontendUrl}/qr/redirect/${token}`;
        const qrImage = await QRCode.toDataURL(qrRedirectUrl);

        // Store in QR_TOKENS collection
        const qrTokenData = {
          token,
          registration_url: qrRedirectUrl,
          qr_image: qrImage,
          layout,
          status: 'unclaimed', // unclaimed, claimed
          vendor_id: null,
          created_at: new Date().toISOString(),
          claimed_at: null,
        };

        await firebaseService.setDocument('qr_tokens', token, qrTokenData);
        tokens.push({ token, status: 'unclaimed' });

        console.log(`[QRService]  Generated QR token: ${token}`);
      } catch (error) {
        console.error(`[QRService]  Failed to generate QR token ${i}:`, error.message);
      }
    }

    return { generated: tokens.length, total: count, tokens };
  }

  /**
   * Validate if QR token exists and is unclaimed
   */
  async validateQRToken(token) {
    try {
      const qrToken = await firebaseService.getDocument('qr_tokens', token);

      if (!qrToken) {
        throw { status: 404, message: 'QR token not found' };
      }

      // If claimed and admin verified, return storefront details immediately
      if (qrToken.status === 'claimed' && qrToken.admin_verified) {
        return {
          token,
          valid: true,
          claimed: true,
          admin_verified: true,
          vendor_id: qrToken.vendor_id,
          vendor_slug: qrToken.vendor_slug || qrToken.vendor_id,
          redirect_to_storefront: true
        };
      }

      // If claimed but not verified yet, still in registration/verification phase
      if (qrToken.status === 'claimed' && !qrToken.admin_verified) {
        let vendorDetails = null;
        if (qrToken.vendor_id) {
          try {
            vendorDetails = await firebaseService.getDocument('vendors', qrToken.vendor_id);
          } catch (err) {
            console.log(`[QRService] Vendor not found for claimed QR: ${qrToken.vendor_id}`);
          }
        }

        throw {
          status: 410,
          message: 'QR token claimed but not verified yet',
          claimed: true,
          admin_verified: false,
          vendor_id: qrToken.vendor_id,
          vendor_slug: vendorDetails?.slug || qrToken.vendor_slug || qrToken.vendor_id,
          vendor_name: vendorDetails?.name || 'Unknown Vendor'
        };
      }

      // Unclaimed QR
      return {
        token,
        valid: true,
        status: qrToken.status,
        layout: qrToken.layout,
      };
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: 'Error validating QR token: ' + error.message };
    }
  }

  /**
   * Claim QR token and assign to vendor
   */
  async claimQRToken(token, vendorId, vendorSlug) {
    try {
      const qrToken = await firebaseService.getDocument('qr_tokens', token);

      if (!qrToken) {
        throw { status: 404, message: 'QR token not found' };
      }

      if (qrToken.status === 'claimed') {
        throw { status: 400, message: 'QR token already claimed' };
      }

      // Mark token as claimed and store vendor slug
      await firebaseService.updateDocument('qr_tokens', token, {
        status: 'claimed',
        vendor_id: vendorId,
        vendor_slug: vendorSlug,
        admin_verified: false,
        claimed_at: new Date().toISOString(),
      });

      console.log(`[QRService]  Claimed QR token ${token} for vendor ${vendorId}`);

      return {
        token,
        vendor_id: vendorId,
        status: 'claimed',
      };
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: 'Error claiming QR token: ' + error.message };
    }
  }

  /**
   * Get all QR tokens (admin)
   */
  async getAllQRTokens(page = 1, limit = 50, filterStatus = null) {
    try {
      let tokens = await firebaseService.getCollection('qr_tokens');

      if (filterStatus) {
        tokens = tokens.filter(t => t.status === filterStatus);
      }

      const start = (page - 1) * limit;
      const end = start + limit;

      return {
        data: tokens.slice(start, end),
        total: tokens.length,
        page,
        limit,
        pages: Math.ceil(tokens.length / limit),
      };
    } catch (error) {
      throw { status: 500, message: 'Error fetching QR tokens: ' + error.message };
    }
  }

  /**
   * Get QR token details
   */

  /**
   * Admin verifies a claimed QR token
   * After verification, customer scans will redirect directly to storefront
   */
  async verifyQRToken(token) {
    try {
      const qrToken = await firebaseService.getDocument('qr_tokens', token);

      if (!qrToken) {
        throw { status: 404, message: 'QR token not found' };
      }

      if (qrToken.status !== 'claimed') {
        throw { status: 400, message: 'Can only verify claimed QR tokens' };
      }

      if (qrToken.admin_verified) {
        throw { status: 400, message: 'QR token already verified' };
      }

      // Regenerate QR image to point directly to vendor storefront
      let newQRImage = qrToken.qr_image; // fallback to current image
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://mintcream-chinchilla-207752.hostingsite.com';
        const storefrontUrl = `${frontendUrl}/scan/${qrToken.vendor_slug || qrToken.vendor_id}`;
        newQRImage = await QRCode.toDataURL(storefrontUrl);
        console.log(`[QRService] Regenerated QR image to point to storefront: ${storefrontUrl}`);
      } catch (err) {
        console.warn(`[QRService] Could not regenerate QR image: ${err.message}`);
      }

      // Mark as admin verified and update QR image
      await firebaseService.updateDocument('qr_tokens', token, {
        admin_verified: true,
        verified_at: new Date().toISOString(),
        qr_image: newQRImage, // Updated image points to /scan/vendor-slug
        registration_url: `${process.env.FRONTEND_URL || 'https://mintcream-chinchilla-207752.hostingsite.com'}/scan/${qrToken.vendor_slug || qrToken.vendor_id}`,
      });

      console.log(`[QRService] Admin verified QR token ${token} - image updated to point to storefront`);

      return {
        token,
        admin_verified: true,
        vendor_id: qrToken.vendor_id,
        vendor_slug: qrToken.vendor_slug,
        qr_image: newQRImage
      };
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: 'Error verifying QR token: ' + error.message };
    }
  }  async getQRToken(token) {
    try {
      const qrToken = await firebaseService.getDocument('qr_tokens', token);

      if (!qrToken) {
        throw { status: 404, message: 'QR token not found' };
      }

      return qrToken;
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: 'Error fetching QR token: ' + error.message };
    }
  }

  /**
   * Delete QR token (admin)
   */
  async deleteQRToken(token) {
    try {
      await firebaseService.deleteDocument('qr_tokens', token);
      console.log(`[QRService]  Deleted QR token: ${token}`);
      return { success: true };
    } catch (error) {
      throw { status: 500, message: 'Error deleting QR token: ' + error.message };
    }
  }

  /**
   * Regenerate QR to point directly to vendor storefront
   */
  async regenerateQRForStorefront(token, vendorId, frontendUrl = process.env.FRONTEND_URL || 'https://mintcream-chinchilla-207752.hostingersite.com') {
    try {
      const qrToken = await firebaseService.getDocument('qr_tokens', token);

      if (!qrToken) {
        throw { status: 404, message: 'QR token not found' };
      }

      if (qrToken.status !== 'claimed' || qrToken.vendor_id !== vendorId) {
        throw { status: 400, message: 'QR token not claimed by this vendor' };
      }

      // Generate new QR that points directly to redirect endpoint (keeps same token)
      const redirectUrl = `${frontendUrl}/qr/redirect/${token}`;
      const qrImage = await QRCode.toDataURL(redirectUrl);

      // Update QR token with new image
      await firebaseService.updateDocument('qr_tokens', token, {
        qr_image: qrImage,
        registration_url: redirectUrl,
        updated_at: new Date().toISOString(),
      });

      console.log(`[QRService]  Updated QR image for token: ${token}`);

      return { qr_image: qrImage, redirect_url: redirectUrl };
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: 'Error regenerating QR: ' + error.message };
    }
  }
}

module.exports = new QRService();





