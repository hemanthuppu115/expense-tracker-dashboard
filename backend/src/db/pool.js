const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'expense_tracker',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Return DATE columns as strings, not JS Date objects
  dateStrings: ['DATE'],
});

module.exports = pool;
