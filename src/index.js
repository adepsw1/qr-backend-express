const path = require('path');

// Try multiple .env locations for different deployment scenarios
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env'),
  '.env'
];

for (const envPath of envPaths) {
  require('dotenv').config({ path: envPath });
}

const express = require('express');
const cors = require('cors');

// Debug: Check if env vars are loaded
console.log('[ENV] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('[ENV] JWT_SECRET loaded:', !!process.env.JWT_SECRET);

// Set default JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  console.log('⚠️  JWT_SECRET not set, using default');
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-minimum-32-characters-long!';
}

const firebaseService = require('./services/firebase.service');
const { sequelize } = require('./services/database.service');
const authRoutes = require('./routes/auth.routes');
const vendorRoutes = require('./routes/vendor.routes');
const customerRoutes = require('./routes/customer.routes');
const offerRoutes = require('./routes/offer.routes');
const redemptionRoutes = require('./routes/redemption.routes');
const broadcastRoutes = require('./routes/broadcast.routes');
const webhookRoutes = require('./routes/webhook.routes');
const productRoutes = require('./routes/product.routes');
const qrRoutes = require('./routes/qr.routes');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Increase limit for any base64 data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS - Allow all origins for now (simplifies mobile/web access)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Handle preflight requests
app.options('*', cors());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'QR Backend API is running', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin: Get database stats
app.get('/api/admin/db-stats', (req, res) => {
  const stats = firebaseService.getDataStats();
  res.json({ success: true, data: stats });
});

// Admin: Clear all data (DANGEROUS - development only)
app.post('/api/admin/clear-all-data', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not allowed in production' });
  }
  await firebaseService.clearAllData();
  res.json({ success: true, message: 'All data cleared' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/offer', offerRoutes);
app.use('/api/redemption', redemptionRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/product', productRoutes);
app.use('/api/qr', qrRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
