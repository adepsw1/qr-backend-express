const { v4: uuidv4 } = require('uuid');
const hybridStorageService = require('./hybrid-storage.service');

class CustomerService {
  async sendOTPToCustomer(phoneNumber) {
    if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      throw { status: 400, message: 'Invalid phone number' };
    }
    return { sessionToken: `session-${uuidv4()}` };
  }

  // SIMPLIFIED: Store only phone, name, vendor_id
  async optInCustomer(data) {
    if (!data.phoneNumber || !data.vendorId) {
      throw { status: 400, message: 'Phone number and vendor ID required' };
    }

    // Use phone number as document ID for simple lookup
    let customer = await hybridStorageService.getDocument('customers', data.phoneNumber);

    if (!customer) {
      // MINIMAL customer data
      customer = {
        phone: data.phoneNumber,
        name: data.name || 'Customer',
        vendor_id: data.vendorId,
      };
      await hybridStorageService.setDocument('customers', data.phoneNumber, customer);
      console.log(`[CustomerService] ✅ New customer created: ${data.phoneNumber}`);
    } else {
      // Update name if provided
      if (data.name) customer.name = data.name;
      customer.vendor_id = data.vendorId;
      await hybridStorageService.updateDocument('customers', data.phoneNumber, customer);
    }

    return {
      phone: data.phoneNumber,
      name: customer.name,
      vendor_id: data.vendorId,
      message: 'Customer registered successfully',
    };
  }

  async getCustomer(customerId) {
    const customer = await hybridStorageService.getDocument('customers', customerId);
    if (!customer) {
      throw { status: 404, message: `Customer ${customerId} not found` };
    }
    return customer;
  }

  async getCustomerByPhone(phoneNumber) {
    const customer = await hybridStorageService.getDocument('customers', phoneNumber);
    if (!customer) {
      throw { status: 404, message: `Customer with phone ${phoneNumber} not found` };
    }
    return customer;
  }

  async getVendorCustomers(vendorId, page = 1, limit = 50) {
    const allCustomers = await hybridStorageService.queryCollection('customers', 'vendor_id', '==', vendorId);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: allCustomers.slice(start, end),
      total: allCustomers.length,
    };
  }

  async getCustomerVendors(phoneNumber) {
    // Get all vendors this customer has interacted with
    const redemptions = await hybridStorageService.queryCollection('redemptions', 'phoneNumber', '==', phoneNumber);
    const vendorIds = [...new Set(redemptions.map(r => r.vendorId))];
    return vendorIds;
  }

  async optOutCustomer(phoneNumber, vendorId) {
    // Simply delete the customer record
    await hybridStorageService.deleteDocument('customers', phoneNumber);
    return { message: 'Customer opted out successfully' };
  }
}

module.exports = new CustomerService();
