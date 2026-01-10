const { v4: uuidv4 } = require('uuid');
const hybridStorageService = require('./hybrid-storage.service');

class OfferService {
  async createOffer(data) {
    if (!data.title || !data.description || !data.expiry_date) {
      throw { status: 400, message: 'Title, description, and expiry date required' };
    }

    const offerId = uuidv4();
    // MINIMAL offer data
    const offer = {
      id: offerId,
      title: data.title,
      description: data.description,
      category: data.category || 'General',
      expiry_date: new Date(data.expiry_date).toISOString(),
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    await hybridStorageService.setDocument('offers', offerId, offer);
    console.log(`[OfferService] ✅ Offer created: ${offerId}`);
    return offer;
  }

  async getOffer(offerId) {
    const offer = await hybridStorageService.getDocument('offers', offerId);
    if (!offer) {
      throw { status: 404, message: `Offer ${offerId} not found` };
    }
    return offer;
  }

  async getAllOffers(page = 1, limit = 20) {
    const allOffers = await hybridStorageService.getCollection('offers');
    console.log(`[OfferService] getAllOffers: Retrieved ${allOffers.length} offers`);
    const start = (page - 1) * limit;
    const end = start + limit;

    const offersWithStats = await Promise.all(
      allOffers.map(async (offer) => {
        try {
          const vendorActions = await hybridStorageService.queryCollection('vendor_offer_actions', 'offer_id', '==', offer.id);
          const accepted = vendorActions.filter(a => a.status === 'accepted').length;
          const rejected = vendorActions.filter(a => a.status === 'rejected').length;
          const pending = vendorActions.filter(a => a.status === 'pending').length;

          return { ...offer, vendors_accepted: accepted, vendors_rejected: rejected, vendors_pending: pending };
        } catch (error) {
          return { ...offer, vendors_accepted: 0, vendors_rejected: 0, vendors_pending: 0 };
        }
      })
    );

    return {
      data: offersWithStats.slice(start, end),
      total: allOffers.length,
    };
  }

  async updateOffer(offerId, data) {
    const offer = await hybridStorageService.getDocument('offers', offerId);
    if (!offer) {
      throw { status: 404, message: `Offer ${offerId} not found` };
    }

    const updated = { ...offer, ...data, updated_at: new Date().toISOString() };
    await hybridStorageService.updateDocument('offers', offerId, updated);
    return updated;
  }

  async deleteOffer(offerId) {
    const offer = await hybridStorageService.getDocument('offers', offerId);
    if (!offer) {
      throw { status: 404, message: `Offer ${offerId} not found` };
    }
    await hybridStorageService.deleteDocument('offers', offerId);
  }

  async publishOffer(offerId, vendorIds) {
    const offer = await this.getOffer(offerId);

    if (vendorIds.length === 0) {
      throw { status: 400, message: 'At least one vendor must be selected' };
    }

    for (const vendorId of vendorIds) {
      const selectionId = uuidv4();
      await hybridStorageService.setDocument('vendor_offer_actions', selectionId, {
        id: selectionId,
        offer_id: offerId,
        vendor_id: vendorId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    const updated = await this.updateOffer(offerId, {
      status: 'published',
      vendors_selected: vendorIds.length,
    });

    return { ...updated, vendors_selected: vendorIds.length, message: `Offer sent to ${vendorIds.length} vendors` };
  }

  async getOffersForVendor(vendorId) {
    const vendorOffers = await hybridStorageService.queryCollection('vendor_offer_actions', 'vendor_id', '==', vendorId);
    const pendingOffers = vendorOffers.filter(sel => sel.status === 'pending');
    const offerDetails = [];

    for (const selection of pendingOffers) {
      const offer = await hybridStorageService.getDocument('offers', selection.offer_id);
      if (offer) offerDetails.push(offer);
    }

    return offerDetails;
  }

  async vendorAcceptOffer(offerId, vendorId) {
    const offer = await hybridStorageService.getDocument('offers', offerId);
    if (!offer) {
      throw { status: 404, message: `Offer ${offerId} not found` };
    }

    const vendorOffers = await hybridStorageService.queryCollection('vendor_offer_actions', 'vendor_id', '==', vendorId);
    const offerAction = vendorOffers.find(o => o.offer_id === offerId);

    if (!offerAction) {
      throw { status: 404, message: 'Offer not found for this vendor' };
    }

    await hybridStorageService.updateDocument('vendor_offer_actions', offerAction.id, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    });

    console.log('[OfferService] ✅ Offer accepted by vendor:', vendorId, 'Offer:', offerId);
    return { offer_id: offerId, vendor_id: vendorId, status: 'accepted', accepted_at: new Date().toISOString() };
  }

  async vendorRejectOffer(offerId, vendorId) {
    const offer = await hybridStorageService.getDocument('offers', offerId);
    if (!offer) {
      throw { status: 404, message: `Offer ${offerId} not found` };
    }

    const vendorOffers = await hybridStorageService.queryCollection('vendor_offer_actions', 'vendor_id', '==', vendorId);
    const offerAction = vendorOffers.find(o => o.offer_id === offerId);

    if (!offerAction) {
      throw { status: 404, message: 'Offer not found for this vendor' };
    }

    await hybridStorageService.updateDocument('vendor_offer_actions', offerAction.id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
    });

    console.log('[OfferService] ❌ Offer rejected by vendor:', vendorId, 'Offer:', offerId);
    return { offer_id: offerId, vendor_id: vendorId, status: 'rejected', rejected_at: new Date().toISOString() };
  }

  async getOfferAnalytics(offerId) {
    return {
      offer_id: offerId,
      total_vendors_sent: 0,
      vendors_accepted: 0,
      vendors_rejected: 0,
      total_customers_reached: 0,
      messages_sent: 0,
      messages_delivered: 0,
      delivery_rate: '0%',
    };
  }

  async getVendorOffers(vendorId, page = 1, limit = 20) {
    const vendorOffers = await hybridStorageService.queryCollection('vendor_offer_actions', 'vendor_id', '==', vendorId);
    const offerDetails = [];

    for (const selection of vendorOffers) {
      const offer = await hybridStorageService.getDocument('offers', selection.offer_id);
      if (offer) {
        offerDetails.push({ 
          ...offer, 
          vendor_status: selection.status,
          status: selection.status, // For frontend compatibility
          vendor_action_id: selection.id,
        });
      }
    }

    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: offerDetails.slice(start, end),
      total: offerDetails.length,
    };
  }
}

module.exports = new OfferService();
