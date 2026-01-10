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

module.exports = router;
