const { v4: uuidv4 } = require('uuid');
const firebaseService = require('./firebase.service');

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
    let customer = await firebaseService.getDocument('customers', data.phoneNumber);

    if (!customer) {
      // MINIMAL customer data
      customer = {
        phone: data.phoneNumber,
        name: data.name || 'Customer',
        vendor_id: data.vendorId,
      };
      await firebaseService.setDocument('customers', data.phoneNumber, customer);
      console.log(`[CustomerService] ✅ New customer created: ${data.phoneNumber}`);
    } else {
      // Update name if provided
      if (data.name) customer.name = data.name;
      customer.vendor_id = data.vendorId;
      await firebaseService.updateDocument('customers', data.phoneNumber, customer);
    }

    return {
      phone: data.phoneNumber,
      name: customer.name,
      vendor_id: data.vendorId,
      message: 'Customer registered successfully',
    };
  }

  async getCustomer(customerId) {
    const customer = await firebaseService.getDocument('customers', customerId);
    if (!customer) {
      throw { status: 404, message: `Customer ${customerId} not found` };
    }
    return customer;
  }

  async getCustomerByPhone(phoneNumber) {
    const customer = await firebaseService.getDocument('customers', phoneNumber);
    if (!customer) {
      throw { status: 404, message: `Customer with phone ${phoneNumber} not found` };
    }
    return customer;
  }

  async getVendorCustomers(vendorId, page = 1, limit = 50) {
    const allCustomers = await firebaseService.queryCollection('customers', 'vendor_id', '==', vendorId);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: allCustomers.slice(start, end),
      total: allCustomers.length,
    };
  }

  async getCustomerVendors(phoneNumber) {
    // Get all vendors this customer has interacted with
    const redemptions = await firebaseService.queryCollection('redemptions', 'phoneNumber', '==', phoneNumber);
    const vendorIds = [...new Set(redemptions.map(r => r.vendorId))];
    return vendorIds;
  }

  async optOutCustomer(phoneNumber, vendorId) {
    // Simply delete the customer record
    await firebaseService.deleteDocument('customers', phoneNumber);
    return { message: 'Customer opted out successfully' };
  }
}

module.exports = new CustomerService();
