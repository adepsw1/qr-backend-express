// Script to sync database schema with models
const sequelize = require('./src/services/database.service');
const Vendor = require('./src/models/vendor.model');
const Product = require('./src/models/product.model');
const Offer = require('./src/models/offer.model');

async function syncDatabase() {
  try {
    console.log('[Migration] 🔄 Syncing database schema...');
    
    // Sync all models with database
    await sequelize.sync({ alter: true });
    
    console.log('[Migration] ✅ Database schema synchronized successfully!');
    console.log('[Migration] Tables created/updated:');
    console.log('  - vendors');
    console.log('  - products');
    console.log('  - offers');
    
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error syncing database:', error.message);
    process.exit(1);
  }
}

syncDatabase();
