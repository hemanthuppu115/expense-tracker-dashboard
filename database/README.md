# Expense Tracker Dashboard — Database Layer

This directory contains all MySQL database migration, seeding, schema definition, and connection pool configuration for the Expense Tracker Dashboard.

## Directory Structure

- `schema.sql` — Raw MySQL schema declarations (`users`, `expenses`, `budgets`, indexes, foreign keys).
- `pool.js` — Connection pool module using `mysql2/promise`.
- `migrate.js` — Database & table initialization script.
- `seed.js` — Demo data population script (creates `demo@example.com` / `password123` user & sample financial records).

## Commands

From the backend directory:
```bash
# Run database migrations
npm run migrate

# Seed initial demo data
npm run seed
```

Or directly from the database directory:
```bash
node migrate.js
node seed.js
```

## Environment Configuration

Database connection parameters are read from `backend/.env` or environment variables:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=expense_tracker
```
