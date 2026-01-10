require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { initializeTables } = require('../config/schema');
const hybridStorage = require('../services/hybrid-storage.service');

(async () => {
  try {
    console.log('🔄 Creating tables...');
    await initializeTables();
    console.log('✅ Tables ready');

    console.log('🔄 Migrating Firebase → MySQL...');
    const migrated = await hybridStorage.migrateAllToMySQL();
    console.log(`✅ Migration complete. Documents migrated: ${migrated}`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
