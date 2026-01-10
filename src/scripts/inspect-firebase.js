require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const firebaseService = require('../services/firebase.service');

function inferSQLType(value) {
  if (value === null || value === undefined) return 'TEXT';
  const type = typeof value;
  if (type === 'string') return value.length > 500 ? 'LONGTEXT' : value.length > 255 ? 'TEXT' : 'VARCHAR(255)';
  if (type === 'number') return Number.isInteger(value) ? 'INT' : 'DECIMAL(10,2)';
  if (type === 'boolean') return 'BOOLEAN';
  if (type === 'object') {
    if (value._seconds !== undefined) return 'TIMESTAMP';
    return 'JSON';
  }
  return 'TEXT';
}

(async () => {
  const collections = ['qr_tokens','vendors','offers','vendor_offer_actions','customers','redemptions','broadcasts','broadcast_queue','webhook_events','customer_optins','products'];
  for (const collection of collections) {
    console.log(`\nCollection: ${collection}`);
    const docs = await firebaseService.getCollection(collection, 1);
    if (!docs.length) {
      console.log('  (empty)');
      continue;
    }
    const sample = docs[0];
    console.log('  Sample ID:', sample.id || sample.token || sample.vendor_id || sample.email || sample.phone_number);
    Object.entries(sample).forEach(([k,v]) => {
      console.log(`   - ${k}: ${typeof v} -> ${inferSQLType(v)}`);
    });
  }
})();
