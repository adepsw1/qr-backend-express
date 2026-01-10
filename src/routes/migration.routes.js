const express = require('express');
const router = express.Router();
const { initializeTables } = require('../config/schema');
const hybridStorage = require('../services/hybrid-storage.service');
const pool = require('../config/database');

// Init MySQL tables and migrate Firestore data
router.post('/init-mysql', async (req, res) => {
  try {
    await initializeTables();
    const migrated = await hybridStorage.migrateAllToMySQL();
    res.json({ success: true, message: 'MySQL initialized and data migrated', migrated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Migration status
router.get('/migration-status', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    res.json({ success: true, tables: tables.map(t => Object.values(t)[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Migrate images from Firebase to MySQL
router.post('/migrate-images', async (req, res) => {
  try {
    const imageStorage = require('../services/image-storage.service');
    const result = await imageStorage.migrateAllImagesToMySQL();
    res.json({ 
      success: true, 
      message: 'Images migrated successfully', 
      result 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get table row counts for verification
router.get('/table-counts', async (req, res) => {
  try {
    const tables = [
      'vendors', 'customers', 'qr_tokens', 'products', 'offers', 
      'redemptions', 'broadcasts', 'webhook_events', 'vendor_images'
    ];
    
    const counts = {};
    for (const table of tables) {
      try {
        const [result] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result[0].count;
      } catch (err) {
        counts[table] = 0;
      }
    }
    
    res.json({ success: true, counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
