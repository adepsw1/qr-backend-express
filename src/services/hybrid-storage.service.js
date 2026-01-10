const firebaseService = require('./firebase.service');
const mysqlService = require('./mysql.service');

class HybridStorageService {
  async add(collection, data) {
    await Promise.all([
      firebaseService.setDocument(collection, data.id || data.token || data.qr_token || data.vendor_id || data.email || data.phone_number, data),
      mysqlService.add(collection, data)
    ]);
    return data;
  }

  async set(collection, id, data) {
    await Promise.all([
      firebaseService.setDocument(collection, id, data),
      mysqlService.set(collection, id, data)
    ]);
    return { id, ...data };
  }

  async get(collection, id) {
    let doc = await mysqlService.get(collection, id);
    if (doc) return doc;
    doc = await firebaseService.getDocument(collection, id);
    if (doc) await mysqlService.set(collection, id, doc);
    return doc;
  }

  async getCollection(collection, limit = 100) {
    const docs = await mysqlService.getAll(collection, limit);
    if (docs && docs.length) return docs;
    const firebaseDocs = await firebaseService.getCollection(collection, limit);
    firebaseDocs.forEach(doc => mysqlService.set(collection, doc.id || doc.token || doc.vendor_id || doc.email || doc.phone_number, doc).catch(() => {}));
    return firebaseDocs;
  }

  async queryCollection(collection, field, operator, value) {
    const docs = await mysqlService.query(collection, field, operator, value);
    if (docs && docs.length) return docs;
    const firebaseDocs = await firebaseService.queryCollection(collection, field, operator, value);
    firebaseDocs.forEach(doc => mysqlService.set(collection, doc.id || doc.token || doc.vendor_id || doc.email || doc.phone_number, doc).catch(() => {}));
    return firebaseDocs;
  }

  async update(collection, id, data) {
    await Promise.all([
      firebaseService.updateDocument(collection, id, data),
      mysqlService.update(collection, id, data)
    ]);
    return { id, ...data };
  }

  async delete(collection, id) {
    await Promise.all([
      firebaseService.deleteDocument(collection, id),
      mysqlService.delete(collection, id)
    ]);
  }

  async migrateAllToMySQL() {
    const collections = [
      'qr_tokens',
      'vendors',
      'offers',
      'vendor_offer_actions',
      'customers',
      'redemptions',
      'broadcasts',
      'broadcast_queue',
      'webhook_events',
      'customer_optins',
      'products',
    ];

    let total = 0;
    for (const collection of collections) {
      const docs = await firebaseService.getCollection(collection, 10000);
      for (const doc of docs) {
        const id = doc.id || doc.token || doc.vendor_id || doc.email || doc.phone_number;
        if (!id) continue;
        try {
          await mysqlService.set(collection, id, doc);
          total++;
        } catch (e) {
          console.warn(`⚠️ Failed to migrate ${collection}/${id}: ${e.message}`);
        }
      }
    }
    return total;
  }
}

module.exports = new HybridStorageService();
