require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes     = require('./routes/auth');
const expenseRoutes  = require('./routes/expenses');
const analyticsRoutes = require('./routes/analytics');
const budgetRoutes   = require('./routes/budgets');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',      authRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets',   budgetRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Expense Tracker API running on http://localhost:${PORT}`);
});
