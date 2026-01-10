require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('../config/database');

(async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'broadcast_queue','vendor_offer_actions','customer_optins','products','redemptions','customers','offers','broadcasts','webhook_events','vendors','qr_tokens'
    ];
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
      console.log(`✅ Dropped ${table}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ All tables dropped');
  } catch (err) {
    console.error('❌ drop-tables failed:', err.message);
  } finally {
    connection.release();
  }
})();
