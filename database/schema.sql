-- Expense Tracker Dashboard Database Schema (MySQL)

CREATE DATABASE IF NOT EXISTS `expense_tracker` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `expense_tracker`;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: expenses
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses (user_id, category);

-- Table: budgets
CREATE TABLE IF NOT EXISTS budgets (
  id       CHAR(36)      NOT NULL PRIMARY KEY,
  user_id  CHAR(36)      NOT NULL,
  month    DATE          NOT NULL COMMENT 'Always the 1st of the month, e.g. 2025-06-01',
  amount   DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  UNIQUE KEY uq_budgets_user_month (user_id, month),
  CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
