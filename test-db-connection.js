const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('[DEBUG] Database Configuration:');
console.log('  Host:', process.env.DB_HOST);
console.log('  Port:', process.env.DB_PORT);
console.log('  Database:', process.env.DB_NAME);
console.log('  User:', process.env.DB_USER);
console.log('  Password:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: (msg) => console.log('[SQL]', msg),
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000
    }
  }
);

sequelize.authenticate()
  .then(() => {
    console.log('[✅] Connection successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[❌] Connection failed!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('Full Error:', err);
    process.exit(1);
  });
