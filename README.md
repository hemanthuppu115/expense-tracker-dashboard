# Expense Tracker Dashboard

A full-stack expense tracking app with auth, CRUD, and a analytics dashboard. Built as a practice project focused on **auth patterns** and **efficient aggregation query design** — both common interview topics.

**Demo credentials:** `demo@example.com` / `password123`

---

## Tech Stack

| Layer     | Choice                                  |
|-----------|-----------------------------------------|
| Backend   | Node.js, Express                        |
| Database  | PostgreSQL                              |
| Auth      | JWT (Bearer token) + bcrypt             |
| Frontend  | React 18, Vite, TailwindCSS, Recharts   |
| Validation| express-validator                       |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 1. Backend

```bash
cd backend
npm install

# Copy and fill in your DB connection string and JWT secret
cp .env.example .env

# Create tables and indexes
npm run migrate

# Load demo user + ~90 realistic expenses across 3 months
npm run seed

# Start the API server (port 3001)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install

# Start the dev server (port 5173)
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

The Vite dev server proxies all `/api` requests to `http://localhost:3001` — no CORS configuration needed during development.

---

## Schema Design

### Why these three tables?

```sql
users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,       -- bcrypt hash, never plaintext
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ
)

expenses (
  id         UUID PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  amount     NUMERIC(12,2) CHECK (amount > 0),
  category   TEXT NOT NULL,
  date       DATE NOT NULL,       -- intentionally DATE, not TIMESTAMP (see below)
  note       TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

budgets (
  id       UUID PRIMARY KEY,
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  month    DATE NOT NULL,         -- always the 1st of the month, e.g. 2025-06-01
  amount   NUMERIC(12,2) CHECK (amount > 0),
  UNIQUE (user_id, month)
)
```

**`expenses.date` is `DATE`, not `TIMESTAMP`**

An expense happened on a day. Storing time-of-day would mean every `date_trunc` call has to handle timezone offsets, and every index range scan needs to account for partial-day boundaries. Using `DATE` keeps `date_trunc('month', date)` clean and unambiguous, and keeps the composite index tight.

**`budgets.month` is always the 1st of the month**

Normalising to `YYYY-MM-01` means we can join budgets directly against `date_trunc('month', expenses.date)::DATE` without any string parsing or special formatting. The `UNIQUE (user_id, month)` constraint enforces one budget per user per month and lets us do an upsert with `ON CONFLICT ... DO UPDATE`.

**`NUMERIC(12,2)` for money, not `FLOAT`**

`FLOAT` is a binary floating-point type — it cannot represent 0.10 exactly. `NUMERIC` is a decimal type and does exact arithmetic. For financial data this matters: `0.10 + 0.20` in `FLOAT` is `0.30000000000000004`; in `NUMERIC` it's `0.30`.

### Indexes

```sql
-- Primary access pattern: user's expenses sorted by date (list page, timeline chart)
CREATE INDEX idx_expenses_user_date     ON expenses (user_id, date DESC);

-- Secondary: category breakdown queries filter on (user_id, category)
CREATE INDEX idx_expenses_user_category ON expenses (user_id, category);
```

Both indexes are **composite, user-first** because every query in this app is scoped to a single user. A query like `WHERE user_id = $1 AND date >= $2` can satisfy both predicates in one index range scan rather than a full table scan followed by a filter.

---

## Aggregation Query Design

This is the part worth understanding deeply before an interview.

### Month-over-month totals in a single query

The naive approach is two separate queries:

```sql
-- Naive: two round-trips
SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND date >= '2025-07-01' AND date < '2025-08-01';
SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND date >= '2025-06-01' AND date < '2025-07-01';
```

We do it in one query using **conditional aggregation** with the `FILTER` clause:

```sql
SELECT
  COALESCE(SUM(amount) FILTER (
    WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
  ), 0) AS this_month,
  COALESCE(SUM(amount) FILTER (
    WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
  ), 0) AS last_month
FROM expenses
WHERE user_id = $1
  AND date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
```

**Why this is better:**

1. **One round-trip** to the database. TCP overhead is real; halving the number of queries matters at scale.
2. **Bounded scan.** The `WHERE date >=` clause restricts the scan to at most 2 months of rows. The composite index `(user_id, date DESC)` can serve this as a single index range scan — PostgreSQL seeks to the first row matching `(user_id, start_of_last_month)` and reads forward. It never touches rows older than 2 months.
3. **`FILTER` vs `CASE WHEN`.** `FILTER` is the SQL:2003 standard syntax and is marginally more readable than `SUM(CASE WHEN ... THEN amount END)`. They produce identical query plans in PostgreSQL.
4. **`COALESCE(..., 0)`.** When a user has no expenses in a month, `SUM` returns `NULL`. `COALESCE` converts that to `0` so the frontend never has to handle `null` arithmetic.

### Spend over time with zero-filled gaps

A `GROUP BY date_trunc('month', date)` query only returns months that have at least one expense. If a user skips a month, the line chart gets a missing data point and Recharts draws a gap. We fill those gaps in SQL using `generate_series`:

```sql
WITH
  series AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - '6 months'::INTERVAL),
      date_trunc('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE AS period
  ),
  actuals AS (
    SELECT
      date_trunc('month', date)::DATE AS period,
      SUM(amount)::NUMERIC(12,2)      AS total
    FROM expenses
    WHERE user_id = $1
      AND date >= date_trunc('month', CURRENT_DATE - '6 months'::INTERVAL)
    GROUP BY 1
  )
SELECT
  s.period,
  COALESCE(a.total, 0) AS total
FROM series s
LEFT JOIN actuals a USING (period)
ORDER BY s.period
```

`generate_series` produces every month bucket in the window. The `LEFT JOIN` then fills `NULL` (no expenses) with `0` via `COALESCE`. The result is always a complete, continuous series — no JavaScript needed to patch missing points.

**The alternative** is to pull the raw `GROUP BY` result into JavaScript and fill the gaps there. This works but it means more code on the client, and you're potentially pulling a sparse dataset over the network and then discarding the sparseness. Doing it in SQL keeps the data contract clean: the API always returns exactly N data points.

### Category breakdown

```sql
SELECT
  category,
  SUM(amount)::NUMERIC(12,2) AS total,
  COUNT(*)::INT               AS count
FROM expenses
WHERE user_id = $1
  AND date >= date_trunc('month', CURRENT_DATE)
  AND date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY category
ORDER BY total DESC
```

Straightforward `GROUP BY`. The `(user_id, category)` index makes the grouping faster for users with large datasets because PostgreSQL can do an **index scan with sorted output** — it already has rows grouped by `(user_id, category)` and just needs to sum within each group.

---

## API Reference

### Auth
| Method | Path               | Auth | Description              |
|--------|--------------------|------|--------------------------|
| POST   | `/api/auth/signup` | —    | Create account           |
| POST   | `/api/auth/login`  | —    | Login, receive JWT       |
| GET    | `/api/auth/me`     | ✓    | Validate token, get user |

### Expenses
| Method | Path                  | Auth | Description                              |
|--------|-----------------------|------|------------------------------------------|
| GET    | `/api/expenses`       | ✓    | List with filters: `from`, `to`, `category`, `page`, `limit` |
| POST   | `/api/expenses`       | ✓    | Create expense                           |
| PUT    | `/api/expenses/:id`   | ✓    | Update expense                           |
| DELETE | `/api/expenses/:id`   | ✓    | Delete expense                           |

### Analytics
| Method | Path                           | Auth | Description                       |
|--------|--------------------------------|------|-----------------------------------|
| GET    | `/api/analytics/summary`       | ✓    | MoM totals + budget progress      |
| GET    | `/api/analytics/by-category`   | ✓    | Category breakdown for date range |
| GET    | `/api/analytics/over-time`     | ✓    | Monthly totals (zero-filled)      |
| GET    | `/api/analytics/month-over-month` | ✓ | Last N months side-by-side        |

### Budgets
| Method | Path                    | Auth | Description           |
|--------|-------------------------|------|-----------------------|
| GET    | `/api/budgets`          | ✓    | List all budgets      |
| GET    | `/api/budgets/:month`   | ✓    | Get budget for month  |
| PUT    | `/api/budgets/:month`   | ✓    | Upsert budget         |
| DELETE | `/api/budgets/:month`   | ✓    | Delete budget         |

`:month` accepts `YYYY-MM` or `YYYY-MM-DD` and is normalised to the 1st of the month.

---

## Edge Cases Handled

| Case | How it's handled |
|---|---|
| No expenses yet | Dashboard shows empty states, not errors. `COALESCE` ensures chart endpoints return 0 instead of NULL. `generate_series` returns zero-filled time series. |
| Negative / zero amounts | `CHECK (amount > 0)` constraint in the DB rejects them at the data layer. The API validates with `isFloat({ gt: 0 })` before the query runs. |
| Future-dated entries | Allowed (you can log a pre-paid expense), but entries more than 1 year in the future are rejected to catch data entry errors. They're included in analytics if they fall within the queried window. |
| Division by zero in MoM % | When `last_month = 0`, `change_pct` is returned as `null` and the UI displays "N/A (no prior data)". |
| Budget overage | `budget_pct_used` can exceed 100. The progress bar caps visual width at 100% but turns red and shows the overage amount in text. |
| Duplicate budget upsert | `ON CONFLICT (user_id, month) DO UPDATE` — no duplicate rows, no 409 error, just a clean update. |
| Token expiry | Axios response interceptor catches 401s, clears localStorage, and redirects to `/login`. |

---

## Project Structure

```
.
├── backend/
│   ├── scripts/
│   │   ├── migrate.js      # One-time schema setup
│   │   └── seed.js         # Demo data generator
│   └── src/
│       ├── db/
│       │   └── pool.js     # pg Pool singleton
│       ├── middleware/
│       │   ├── auth.js     # JWT Bearer verification
│       │   └── validate.js # express-validator result checker
│       ├── routes/
│       │   ├── auth.js
│       │   ├── expenses.js
│       │   ├── analytics.js  # All aggregation queries live here
│       │   └── budgets.js
│       └── index.js        # Express app + route mounting
└── frontend/
    └── src/
        ├── api/
        │   ├── client.js   # Axios instance with JWT interceptor
        │   └── expenses.js # API helper functions
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── ExpenseModal.jsx
        │   └── BudgetWidget.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── SignupPage.jsx
            ├── DashboardPage.jsx
            └── ExpensesPage.jsx
```

---

## Interview Answer: "How did you calculate month-over-month totals efficiently?"

> We use a single SQL query with **conditional aggregation** (`SUM ... FILTER (WHERE ...)`) rather than two separate queries. The `WHERE` clause bounds the scan to exactly two months of rows, which the composite index on `(user_id, date DESC)` serves as a single range scan — PostgreSQL seeks to the start of last month and reads forward, touching no rows older than that. One round-trip, bounded scan, no application-layer arithmetic. `COALESCE` handles the zero-expense edge case so the API contract is always numeric, never null.
