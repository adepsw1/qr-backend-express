const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class MySQLService {
  async add(table, data) {
    const connection = await pool.getConnection();
    try {
      const id = data.id || uuidv4();
      const { id: _omit, ...rest } = data;
      const keys = Object.keys(rest).map(k => (k === 'order' ? '`order`' : k));
      const values = Object.values(rest);
      const placeholders = keys.map(() => '?').join(',');
      const query = `INSERT INTO ${table} (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`;
      await connection.query(query, [id, ...values]);
      return { id, ...rest };
    } finally {
      connection.release();
    }
  }

  async set(table, id, data) {
    const connection = await pool.getConnection();
    try {
      const { id: _omit, ...rest } = data;
      const keys = Object.keys(rest).map(k => (k === 'order' ? '`order`' : k));
      const values = Object.values(rest);
      const placeholders = keys.map(() => '?').join(',');
      const updates = keys.map(k => `${k} = ?`).join(', ');
      const query = `INSERT INTO ${table} (id, ${keys.join(', ')}) VALUES (?, ${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.query(query, [id, ...values, ...values]);
      return { id, ...rest };
    } finally {
      connection.release();
    }
  }

  async get(table, id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  async getAll(table, limit = 100) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`SELECT * FROM ${table} LIMIT ?`, [limit]);
      return rows;
    } finally {
      connection.release();
    }
  }

  async query(table, field, operator, value) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`SELECT * FROM ${table} WHERE ${field} ${operator} ?`, [value]);
      return rows;
    } finally {
      connection.release();
    }
  }

  async update(table, id, data) {
    const connection = await pool.getConnection();
    try {
      const { id: _omit, ...rest } = data;
      const keys = Object.keys(rest).map(k => (k === 'order' ? '`order`' : k));
      const values = Object.values(rest);
      const updates = keys.map(k => `${k} = ?`).join(', ');
      const query = `UPDATE ${table} SET ${updates} WHERE id = ?`;
      await connection.query(query, [...values, id]);
      return { id, ...rest };
    } finally {
      connection.release();
    }
  }

  async delete(table, id) {
    const connection = await pool.getConnection();
    try {
      await connection.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    } finally {
      connection.release();
    }
  }
}

module.exports = new MySQLService();
