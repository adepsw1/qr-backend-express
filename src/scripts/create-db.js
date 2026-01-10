require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'adepsw1',
    password: process.env.DB_PASSWORD || 'adepsw1'
  });

  const dbName = process.env.DB_NAME || 'xnexretaila';
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE ${dbName}`);
  const [rows] = await connection.query('SELECT DATABASE()');
  console.log('✅ Current database:', rows[0]['DATABASE()']);
  await connection.end();
}

createDatabase().catch(err => {
  console.error('❌ create-db failed:', err.message);
  process.exit(1);
});
