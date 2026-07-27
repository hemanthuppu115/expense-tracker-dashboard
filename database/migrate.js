/**
 * Database Migration Script
 * Creates the database, tables, foreign keys, and indexes.
 *
 * Usage:
 *   node database/migrate.js
 *   or via backend: npm run migrate
 */

const path = require('path');
module.paths.push(path.resolve(__dirname, '../backend/node_modules'));
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  // Connect without a database first so we can CREATE DATABASE IF NOT EXISTS
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });

  try {
    const dbName = process.env.MYSQL_DATABASE || 'expense_tracker';
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         CHAR(36)     NOT NULL PRIMARY KEY,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        name       VARCHAR(255) NOT NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id         CHAR(36)       NOT NULL PRIMARY KEY,
        user_id    CHAR(36)       NOT NULL,
        amount     DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
        category   VARCHAR(100)   NOT NULL,
        date       DATE           NOT NULL,
        note       VARCHAR(500)   NULL,
        created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Composite index: user + date range
    await conn.query(`
      CREATE INDEX idx_expenses_user_date
        ON expenses (user_id, date DESC)
    `).catch(() => {});

    // Secondary index: category breakdown
    await conn.query(`
      CREATE INDEX idx_expenses_user_category
        ON expenses (user_id, category)
    `).catch(() => {});

    await conn.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id       CHAR(36)      NOT NULL PRIMARY KEY,
        user_id  CHAR(36)      NOT NULL,
        month    DATE          NOT NULL COMMENT 'Always the 1st of the month, e.g. 2025-06-01',
        amount   DECIMAL(12,2) NOT NULL CHECK (amount > 0),
        UNIQUE KEY uq_budgets_user_month (user_id, month),
        CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('Migration complete.');
  } finally {
    await conn.end();
    process.exit(0);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
