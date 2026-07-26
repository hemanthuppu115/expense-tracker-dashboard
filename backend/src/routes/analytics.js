/**
 * Analytics routes — all aggregation in MySQL, nothing in JS.
 *
 * KEY MYSQL TRANSLATION DECISIONS vs PostgreSQL:
 *
 * 1. date_trunc('month', date)  →  DATE_FORMAT(date, '%Y-%m-01')
 *    MySQL has no date_trunc. DATE_FORMAT(date, '%Y-%m-01') produces the
 *    same result: the first day of the month that date falls in.
 *    Example: DATE_FORMAT('2025-07-15', '%Y-%m-01') = '2025-07-01'
 *
 * 2. CURRENT_DATE - INTERVAL '1 month'  →  CURRENT_DATE - INTERVAL 1 MONTH
 *    MySQL uses unquoted interval units without the ANSI string syntax.
 *
 * 3. SUM(...) FILTER (WHERE ...)  →  SUM(CASE WHEN ... THEN amount ELSE 0 END)
 *    MySQL doesn't support aggregate FILTER. The CASE WHEN equivalent
 *    produces an identical query plan — the optimizer treats them the same way.
 *
 * 4. generate_series  →  Recursive CTE (WITH RECURSIVE)
 *    MySQL 8.0+ supports recursive CTEs. We generate the month series by
 *    starting at the window's first month and adding 1 MONTH each iteration
 *    until we reach the current month. LEFT JOIN fills zero-spend months.
 *
 * 5. COALESCE(SUM(...), 0) still works — MySQL also returns NULL for SUM
 *    over an empty set.
 */

const express = require('express');
const { query } = require('express-validator');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    // Single query: two conditional SUM(CASE WHEN) covering at most 2 months.
    // The WHERE clause bounds the index scan to rows from last month onward.
    const [[monthRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(CURRENT_DATE) AND MONTH(date) = MONTH(CURRENT_DATE)
                          THEN amount ELSE 0 END), 0) AS this_month,
         COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
                          THEN amount ELSE 0 END), 0) AS last_month
       FROM expenses
       WHERE user_id = ?
         AND date >= DATE_FORMAT(CURRENT_DATE - INTERVAL 1 MONTH, '%Y-%m-01')`,
      [req.user.id]
    );

    const [[budgetRow]] = await pool.query(
      `SELECT amount FROM budgets
       WHERE user_id = ?
         AND YEAR(month)  = YEAR(CURRENT_DATE)
         AND MONTH(month) = MONTH(CURRENT_DATE)`,
      [req.user.id]
    );

    const thisMonth = parseFloat(monthRow.this_month);
    const lastMonth = parseFloat(monthRow.last_month);

    const change_pct = lastMonth === 0
      ? null
      : parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1));

    const budget = budgetRow ? parseFloat(budgetRow.amount) : null;

    res.json({
      this_month: thisMonth,
      last_month: lastMonth,
      change_pct,
      budget,
      budget_remaining: budget !== null ? parseFloat((budget - thisMonth).toFixed(2)) : null,
      budget_pct_used:  budget !== null ? parseFloat(((thisMonth / budget) * 100).toFixed(1)) : null,
    });
  } catch (err) {
    console.error('GET /analytics/summary error:', err);
    res.status(500).json({ error: 'Failed to compute summary.' });
  }
});

// GET /api/analytics/by-category
router.get('/by-category', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
], validate, async (req, res) => {
  const { from, to } = req.query;

  let dateFilter = `AND YEAR(date) = YEAR(CURRENT_DATE) AND MONTH(date) = MONTH(CURRENT_DATE)`;
  const params = [req.user.id];

  if (from && to) {
    dateFilter = 'AND date >= ? AND date <= ?';
    params.push(from, to);
  } else if (from) {
    dateFilter = 'AND date >= ?';
    params.push(from);
  } else if (to) {
    dateFilter = 'AND date <= ?';
    params.push(to);
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         category,
         CAST(SUM(amount) AS DECIMAL(12,2)) AS total,
         COUNT(*)                            AS count
       FROM expenses
       WHERE user_id = ? ${dateFilter}
       GROUP BY category
       ORDER BY total DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /analytics/by-category error:', err);
    res.status(500).json({ error: 'Failed to compute category breakdown.' });
  }
});

// GET /api/analytics/over-time
// Uses a recursive CTE to generate every month bucket so zero-spend months
// are included as 0 — the line chart always has a continuous x-axis.
router.get('/over-time', [
  query('months').optional().isInt({ min: 1, max: 24 }).toInt(),
], validate, async (req, res) => {
  const months = req.query.months || 6;

  try {
    const [rows] = await pool.query(
      `WITH RECURSIVE
         -- Generate every month from (today - N months) up to today
         series (period) AS (
           SELECT DATE_FORMAT(CURRENT_DATE - INTERVAL ? MONTH, '%Y-%m-01')
           UNION ALL
           SELECT DATE_FORMAT(DATE_ADD(period, INTERVAL 1 MONTH), '%Y-%m-01')
           FROM series
           WHERE period < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
         ),
         actuals AS (
           SELECT
             DATE_FORMAT(date, '%Y-%m-01')       AS period,
             CAST(SUM(amount) AS DECIMAL(12,2))  AS total
           FROM expenses
           WHERE user_id = ?
             AND date >= DATE_FORMAT(CURRENT_DATE - INTERVAL ? MONTH, '%Y-%m-01')
           GROUP BY DATE_FORMAT(date, '%Y-%m-01')
         )
       SELECT
         s.period,
         COALESCE(a.total, 0) AS total
       FROM series s
       LEFT JOIN actuals a ON s.period = a.period
       ORDER BY s.period`,
      [months, req.user.id, months]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /analytics/over-time error:', err);
    res.status(500).json({ error: 'Failed to compute spend over time.' });
  }
});

// GET /api/analytics/month-over-month
router.get('/month-over-month', [
  query('months').optional().isInt({ min: 2, max: 12 }).toInt(),
], validate, async (req, res) => {
  const months = req.query.months || 6;
  try {
    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(date, '%Y-%m-01')      AS month,
         CAST(SUM(amount) AS DECIMAL(12,2)) AS total
       FROM expenses
       WHERE user_id = ?
         AND date >= DATE_FORMAT(CURRENT_DATE - INTERVAL ? MONTH, '%Y-%m-01')
       GROUP BY DATE_FORMAT(date, '%Y-%m-01')
       ORDER BY month`,
      [req.user.id, months]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute month-over-month data.' });
  }
});

module.exports = router;
