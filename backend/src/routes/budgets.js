const express = require('express');
const { body, param } = require('express-validator');
const { randomUUID } = require('crypto');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Normalise YYYY-MM or YYYY-MM-DD to YYYY-MM-01
function toMonthStart(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length < 2) return null;
  return `${parts[0]}-${parts[1].padStart(2, '0')}-01`;
}

// GET /api/budgets
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, month, amount FROM budgets WHERE user_id = ? ORDER BY month DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch budgets.' });
  }
});

// GET /api/budgets/:month
router.get('/:month', [
  param('month').matches(/^\d{4}-\d{2}(-\d{2})?$/),
], validate, async (req, res) => {
  const month = toMonthStart(req.params.month);
  try {
    const [rows] = await pool.query(
      'SELECT id, month, amount FROM budgets WHERE user_id = ? AND month = ?',
      [req.user.id, month]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No budget set for that month.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch budget.' });
  }
});

// PUT /api/budgets/:month — upsert
router.put('/:month', [
  param('month').matches(/^\d{4}-\d{2}(-\d{2})?$/),
  body('amount').isFloat({ gt: 0 }).withMessage('Budget amount must be a positive number.'),
], validate, async (req, res) => {
  const month = toMonthStart(req.params.month);
  const { amount } = req.body;
  try {
    // ON DUPLICATE KEY UPDATE is MySQL's upsert — equivalent to PostgreSQL's ON CONFLICT DO UPDATE
    await pool.query(
      `INSERT INTO budgets (id, user_id, month, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [randomUUID(), req.user.id, month, amount]
    );
    const [rows] = await pool.query(
      'SELECT id, month, amount FROM budgets WHERE user_id = ? AND month = ?',
      [req.user.id, month]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /budgets error:', err);
    res.status(500).json({ error: 'Failed to save budget.' });
  }
});

// DELETE /api/budgets/:month
router.delete('/:month', [
  param('month').matches(/^\d{4}-\d{2}(-\d{2})?$/),
], validate, async (req, res) => {
  const month = toMonthStart(req.params.month);
  try {
    const [result] = await pool.query(
      'DELETE FROM budgets WHERE user_id = ? AND month = ?',
      [req.user.id, month]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No budget set for that month.' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget.' });
  }
});

module.exports = router;
