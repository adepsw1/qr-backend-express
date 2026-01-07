const { DataTypes } = require('sequelize');
const sequelize = require('../services/database.service');
const Vendor = require('./vendor.model');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true
  },
  vendor_id: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  icon_emoji: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Product.belongsTo(Vendor, { foreignKey: 'vendor_id' });
Vendor.hasMany(Product, { foreignKey: 'vendor_id' });

module.exports = Product;
