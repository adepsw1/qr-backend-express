const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: (msg) => console.log('[Sequelize]', msg),
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000
    },
    dialectOptions: {
      connectTimeout: 10000,
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// Test connection
sequelize.authenticate()
  .then(() => {
    console.log('[Database] ✅ MySQL connection established successfully');   
  })
  .catch((err) => {
    console.error('[Database] ❌ Unable to connect to MySQL:');
    console.error('Error Message:', err.message);
    console.error('Error Code:', err.code);
    console.error('Error:', err);
  });

module.exports = sequelize;
