/**
 * Seed script — generates a demo user and ~90 realistic expenses spread
 * across the last 3 months, plus a monthly budget.
 *
 * Usage: npm run seed
 *
 * Demo credentials:
 *   email:    demo@example.com
 *   password: password123
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const pool = require('../src/db/pool');

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Utilities',
  'Healthcare', 'Entertainment', 'Shopping', 'Travel', 'Education',
];

const CATEGORY_PROFILES = {
  'Food & Dining':  { min: 8,   max: 85,   perMonth: 20 },
  'Transport':      { min: 5,   max: 60,   perMonth: 10 },
  'Housing':        { min: 800, max: 1500, perMonth: 1  },
  'Utilities':      { min: 40,  max: 180,  perMonth: 3  },
  'Healthcare':     { min: 20,  max: 200,  perMonth: 2  },
  'Entertainment':  { min: 10,  max: 80,   perMonth: 5  },
  'Shopping':       { min: 15,  max: 150,  perMonth: 6  },
  'Travel':         { min: 50,  max: 400,  perMonth: 1  },
  'Education':      { min: 20,  max: 120,  perMonth: 2  },
};

const NOTES = {
  'Food & Dining':  ['Lunch at work', 'Dinner with friends', 'Groceries', 'Coffee & pastry', 'Takeout', 'Weekend brunch', 'Meal prep ingredients'],
  'Transport':      ['Uber to airport', 'Monthly transit pass', 'Gas fill-up', 'Parking fee', 'Lyft downtown', 'Toll charges'],
  'Housing':        ['Monthly rent', 'Mortgage payment', 'Renter insurance'],
  'Utilities':      ['Electric bill', 'Internet service', 'Water & sewage', 'Gas bill', 'Phone bill'],
  'Healthcare':     ['Gym membership', 'Prescription', 'Co-pay visit', 'Dental cleaning', 'Eye exam'],
  'Entertainment':  ['Netflix subscription', 'Movie tickets', 'Concert tickets', 'Video game', 'Spotify', 'Museum visit'],
  'Shopping':       ['New shoes', 'Clothing', 'Amazon order', 'Home supplies', 'Electronics accessories', 'Books'],
  'Travel':         ['Hotel stay', 'Flight booking', 'Airbnb', 'Travel insurance'],
  'Education':      ['Online course', 'Textbook', 'Udemy subscription', 'Conference ticket'],
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function formatDate(date) {
  // Use local year/month/day to avoid UTC rollback on timezone-offset machines
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Create or reuse demo user ─────────────────────────────────────────
    const email = 'demo@example.com';
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`Demo user already exists (id: ${userId}). Clearing old data...`);
      await conn.query('DELETE FROM expenses WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM budgets  WHERE user_id = ?', [userId]);
    } else {
      userId = randomUUID();
      const hash = await bcrypt.hash('password123', 12);
      await conn.query(
        'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
        [userId, email, hash, 'Alex Demo']
      );
      console.log(`Created demo user (id: ${userId})`);
    }

    // ── 2. Generate expenses for last 3 full months + current partial month ──
    const today = new Date();
    const expenses = [];

    for (let monthOffset = -3; monthOffset <= 0; monthOffset++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const monthEnd = monthOffset === 0
        ? today
        : new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);

      for (const category of CATEGORIES) {
        const profile = CATEGORY_PROFILES[category];
        const count = monthOffset === 0
          ? Math.max(1, Math.ceil(profile.perMonth * (today.getDate() / 30)))
          : profile.perMonth;

        for (let i = 0; i < count; i++) {
          const dayRange = Math.floor((monthEnd - monthStart) / (1000 * 60 * 60 * 24));
          const dayOffset = randInt(0, Math.max(0, dayRange));
          const expDate = new Date(monthStart);
          expDate.setDate(expDate.getDate() + dayOffset);

          const amount = parseFloat(rand(profile.min, profile.max).toFixed(2));
          const note = pick(NOTES[category]);
          expenses.push([randomUUID(), userId, amount, category, formatDate(expDate), note]);
        }
      }
    }

    // Batch insert
    for (const row of expenses) {
      await conn.query(
        'INSERT INTO expenses (id, user_id, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)',
        row
      );
    }
    console.log(`Inserted ${expenses.length} expenses.`);

    // ── 3. Set budgets for last 3 months + current month ─────────────────────
    const budgetAmount = 3500.00;
    for (let monthOffset = -3; monthOffset <= 0; monthOffset++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const monthStr = formatDate(monthStart);
      await conn.query(
        `INSERT INTO budgets (id, user_id, month, amount)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
        [randomUUID(), userId, monthStr, budgetAmount]
      );
    }
    console.log(`Set monthly budget to $${budgetAmount} for 4 months.`);

    await conn.commit();
    console.log('\nSeed complete!');
    console.log('───────────────────────────────');
    console.log('Demo login:');
    console.log('  Email:    demo@example.com');
    console.log('  Password: password123');
    console.log('───────────────────────────────');
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
