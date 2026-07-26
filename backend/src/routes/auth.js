const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { randomUUID } = require('crypto');
const pool = require('../db/pool');
const { validate } = require('../middleware/validate');

const router = express.Router();

const signupValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('name').trim().notEmpty().withMessage('Name is required.'),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/signup
router.post('/signup', signupValidators, validate, async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const id = randomUUID();
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
      [id, email, hash, name]
    );

    const user = { id, email, name };
    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', loginValidators, validate, async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, password FROM users WHERE email = ?', [email]
    );
    const user = rows[0];

    // Constant-time path even when user doesn't exist — avoids timing attacks
    const hash = user ? user.password : '$2a$12$invalidhashinvalidhashinvalidhashx';
    const match = await bcrypt.compare(password, hash);

    if (!user || !match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ token: makeToken(user), user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name FROM users WHERE id = ?', [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
