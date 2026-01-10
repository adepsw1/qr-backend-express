const pool = require('./database');

async function initializeTables() {
  const connection = await pool.getConnection();
  try {
    // qr_tokens
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qr_tokens (
        id VARCHAR(255) PRIMARY KEY,
        token VARCHAR(255) UNIQUE,
        layout VARCHAR(255),
        created_at VARCHAR(255),
        claimed_at VARCHAR(255),
        vendor_id VARCHAR(255),
        vendor_slug VARCHAR(255),
        status VARCHAR(255) DEFAULT 'unclaimed',
        registration_url VARCHAR(500),
        updated_at VARCHAR(255),
        qr_image LONGTEXT,
        admin_verified BOOLEAN DEFAULT FALSE,
        verified_at VARCHAR(255),
        INDEX idx_status (status),
        INDEX idx_vendor_id (vendor_id),
        INDEX idx_token (token)
      )
    `);

    // vendors
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(255) PRIMARY KEY,
        created_at VARCHAR(255),
        name VARCHAR(255),
        address VARCHAR(500),
        email VARCHAR(255),
        phone VARCHAR(50),
        qr_code_url LONGTEXT,
        password VARCHAR(255),
        slug VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'active',
        city VARCHAR(255),
        qr_token VARCHAR(255),
        qr_layout VARCHAR(255),
        profile_image VARCHAR(500),
        metadata JSON,
        INDEX idx_email (email),
        INDEX idx_slug (slug)
      )
    `);

    // customers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(255) PRIMARY KEY,
        created_at VARCHAR(255),
        vendorId VARCHAR(255),
        updated_at VARCHAR(255),
        name VARCHAR(255),
        phone_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        metadata JSON,
        INDEX idx_vendorId (vendorId),
        INDEX idx_phone (phone_number),
        UNIQUE KEY unique_vendor_phone (vendorId, phone_number)
      )
    `);

    // redemptions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id VARCHAR(255) PRIMARY KEY,
        otpGeneratedAt VARCHAR(255),
        offerTitle VARCHAR(255),
        offerId VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        offerExpiresAt VARCHAR(255),
        updatedAt VARCHAR(255),
        otpExpiresAt VARCHAR(255),
        createdAt VARCHAR(255),
        sessionId VARCHAR(255),
        customerName VARCHAR(255),
        discountPercent INT,
        otp VARCHAR(20),
        phoneNumber VARCHAR(50),
        vendorId VARCHAR(255),
        offerDescription VARCHAR(500),
        metadata JSON,
        INDEX idx_phoneNumber (phoneNumber),
        INDEX idx_vendorId (vendorId),
        INDEX idx_sessionId (sessionId),
        INDEX idx_otp (otp)
      )
    `);

    // products
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        updatedAt VARCHAR(255),
        name VARCHAR(255),
        price DECIMAL(10,2),
        vendorId VARCHAR(255),
        \`order\` BIGINT,
        createdAt VARCHAR(255),
        isActive BOOLEAN,
        icon VARCHAR(500),
        description VARCHAR(500),
        category VARCHAR(255),
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        metadata JSON,
        INDEX idx_vendorId (vendorId)
      )
    `);

    // offers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        description LONGTEXT,
        status VARCHAR(50) DEFAULT 'draft',
        metadata JSON,
        created_at VARCHAR(255),
        updated_at VARCHAR(255),
        INDEX idx_status (status)
      )
    `);

    // vendor_offer_actions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vendor_offer_actions (
        id VARCHAR(255) PRIMARY KEY,
        vendor_id VARCHAR(255),
        offer_id VARCHAR(255),
        action_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSON,
        created_at VARCHAR(255),
        updated_at VARCHAR(255),
        INDEX idx_vendor_id (vendor_id),
        INDEX idx_offer_id (offer_id)
      )
    `);

    // broadcasts
    await connection.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        message LONGTEXT,
        status VARCHAR(50) DEFAULT 'draft',
        metadata JSON,
        created_at VARCHAR(255),
        updated_at VARCHAR(255),
        INDEX idx_status (status)
      )
    `);

    // broadcast_queue
    await connection.query(`
      CREATE TABLE IF NOT EXISTS broadcast_queue (
        id VARCHAR(255) PRIMARY KEY,
        broadcast_id VARCHAR(255),
        vendor_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSON,
        created_at VARCHAR(255),
        updated_at VARCHAR(255),
        INDEX idx_status (status)
      )
    `);

    // webhook_events
    await connection.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(100),
        payload JSON,
        status VARCHAR(50) DEFAULT 'pending',
        created_at VARCHAR(255),
        INDEX idx_event_type (event_type)
      )
    `);

    // customer_optins
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_optins (
        id VARCHAR(255) PRIMARY KEY,
        phone_number VARCHAR(50),
        vendor_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        metadata JSON,
        created_at VARCHAR(255),
        updated_at VARCHAR(255),
        INDEX idx_phone (phone_number)
      )
    `);

    console.log('✅ All MySQL tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing tables:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { initializeTables };
