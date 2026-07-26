const express = require('express');
const { body, query, param } = require('express-validator');
const { randomUUID } = require('crypto');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const VALID_CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Utilities',
  'Healthcare', 'Entertainment', 'Shopping', 'Travel',
  'Education', 'Other',
];

const expenseValidators = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
  body('category').isIn(VALID_CATEGORIES).withMessage(`Invalid category.`),
  body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date (YYYY-MM-DD).'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must be 500 characters or fewer.'),
];

// GET /api/expenses
router.get('/', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('category').optional().isIn(VALID_CATEGORIES),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
], validate, async (req, res) => {
  const { from, to, category } = req.query;
  const page  = req.query.page  || 1;
  const limit = req.query.limit || 50;
  const offset = (page - 1) * limit;

  let where = 'WHERE user_id = ?';
  const params = [req.user.id];

  if (from)     { where += ' AND date >= ?';     params.push(from); }
  if (to)       { where += ' AND date <= ?';     params.push(to); }
  if (category) { where += ' AND category = ?';  params.push(category); }

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM expenses ${where}`, params
    );

    const [rows] = await pool.query(
      `SELECT id, amount, category, date, note, created_at, updated_at
       FROM expenses ${where}
       ORDER BY date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, amount, category, date, note, created_at, updated_at FROM expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Expense not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense.' });
  }
});

// POST /api/expenses
router.post('/', expenseValidators, validate, async (req, res) => {
  const { amount, category, date, note } = req.body;

  const inputDate = new Date(date);
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (inputDate > oneYearFromNow) {
    return res.status(422).json({ error: 'Date cannot be more than 1 year in the future.' });
  }

  try {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO expenses (id, user_id, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, amount, category, date, note || null]
    );
    const [rows] = await pool.query(
      'SELECT id, amount, category, date, note, created_at, updated_at FROM expenses WHERE id = ?', [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /expenses error:', err);
    res.status(500).json({ error: 'Failed to create expense.' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', expenseValidators, validate, async (req, res) => {
  const { amount, category, date, note } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE expenses SET amount = ?, category = ?, date = ?, note = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [amount, category, date, note || null, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found.' });

    const [rows] = await pool.query(
      'SELECT id, amount, category, date, note, created_at, updated_at FROM expenses WHERE id = ?',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /expenses error:', err);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;
