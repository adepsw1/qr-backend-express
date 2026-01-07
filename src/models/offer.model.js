const { DataTypes } = require('sequelize');
const sequelize = require('../services/database.service');
const Vendor = require('./vendor.model');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true
  },
  vendor_id: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discount_percentage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'offers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Offer.belongsTo(Vendor, { foreignKey: 'vendor_id' });
Vendor.hasMany(Offer, { foreignKey: 'vendor_id' });

module.exports = Offer;
