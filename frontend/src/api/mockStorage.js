// Mock storage & API implementation for offline/demo mode (e.g. GitHub Pages)

const MOCK_STORAGE_KEY_EXPENSES = 'expense_tracker_demo_expenses';
const MOCK_STORAGE_KEY_USERS = 'expense_tracker_demo_users';
const MOCK_STORAGE_KEY_BUDGETS = 'expense_tracker_demo_budgets';

// Seed sample data if empty
function seedInitialData() {
  if (!localStorage.getItem(MOCK_STORAGE_KEY_EXPENSES)) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    
    // Previous month string
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

    const initialExpenses = [
      { id: '1', amount: 120.50, category: 'Food & Dining', date: `${currentYear}-${currentMonth}-02`, note: 'Grocery shopping', created_at: new Date().toISOString() },
      { id: '2', amount: 45.00, category: 'Transport', date: `${currentYear}-${currentMonth}-05`, note: 'Fuel refill', created_at: new Date().toISOString() },
      { id: '3', amount: 890.00, category: 'Housing', date: `${currentYear}-${currentMonth}-01`, note: 'Monthly utilities & maintenance', created_at: new Date().toISOString() },
      { id: '4', amount: 65.20, category: 'Entertainment', date: `${currentYear}-${currentMonth}-10`, note: 'Movie & dinner', created_at: new Date().toISOString() },
      { id: '5', amount: 210.00, category: 'Shopping', date: `${currentYear}-${currentMonth}-12`, note: 'New headphones', created_at: new Date().toISOString() },
      { id: '6', amount: 95.00, category: 'Utilities', date: `${currentYear}-${currentMonth}-14`, note: 'Internet bill', created_at: new Date().toISOString() },
      { id: '7', amount: 150.00, category: 'Healthcare', date: `${currentYear}-${currentMonth}-18`, note: 'Health checkup', created_at: new Date().toISOString() },
      { id: '8', amount: 350.00, category: 'Food & Dining', date: `${prevYear}-${prevMonth}-15`, note: 'Family restaurant dinner', created_at: new Date().toISOString() },
      { id: '9', amount: 500.00, category: 'Travel', date: `${prevYear}-${prevMonth}-20`, note: 'Weekend getaway', created_at: new Date().toISOString() },
    ];
    localStorage.setItem(MOCK_STORAGE_KEY_EXPENSES, JSON.stringify(initialExpenses));
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEY_BUDGETS)) {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const initialBudgets = [
      { id: 'b1', month: currentMonthStr, amount: 2500.00 }
    ];
    localStorage.setItem(MOCK_STORAGE_KEY_BUDGETS, JSON.stringify(initialBudgets));
  }
}

seedInitialData();

function getExpenses() {
  try { return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY_EXPENSES)) || []; }
  catch { return []; }
}

function saveExpenses(expenses) {
  localStorage.setItem(MOCK_STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
}

function getBudgets() {
  try { return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY_BUDGETS)) || []; }
  catch { return []; }
}

function saveBudgets(budgets) {
  localStorage.setItem(MOCK_STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
}

export const mockStorageApi = {
  // Auth mock
  signup: async ({ name, email, password }) => {
    const user = { id: 'demo-user-1', name: name || 'Demo User', email };
    const token = 'mock-demo-jwt-token';
    return { data: { token, user } };
  },

  login: async ({ email, password }) => {
    const name = email.split('@')[0] || 'Demo User';
    const user = { id: 'demo-user-1', name: name.charAt(0).toUpperCase() + name.slice(1), email };
    const token = 'mock-demo-jwt-token';
    return { data: { token, user } };
  },

  getMe: async () => {
    const storedUser = JSON.parse(localStorage.getItem('user')) || {
      id: 'demo-user-1',
      name: 'Demo User',
      email: 'demo@example.com',
    };
    return { data: { user: storedUser } };
  },

  // Expenses mock
  getExpenses: async (params = {}) => {
    let expenses = getExpenses();
    const { category, from, to, page = 1, limit = 50 } = params;

    if (category) expenses = expenses.filter(e => e.category === category);
    if (from) expenses = expenses.filter(e => e.date >= from);
    if (to) expenses = expenses.filter(e => e.date <= to);

    // Sort by date DESC
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = expenses.length;
    const start = (page - 1) * limit;
    const paginated = expenses.slice(start, start + limit);

    return {
      data: {
        data: paginated,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
      }
    };
  },

  getExpenseById: async (id) => {
    const expenses = getExpenses();
    const exp = expenses.find(e => e.id === id);
    if (!exp) throw { response: { status: 404, data: { error: 'Expense not found' } } };
    return { data: exp };
  },

  createExpense: async ({ amount, category, date, note }) => {
    const expenses = getExpenses();
    const newExp = {
      id: String(Date.now()),
      amount: parseFloat(amount),
      category,
      date,
      note: note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    expenses.unshift(newExp);
    saveExpenses(expenses);
    return { data: newExp, status: 201 };
  },

  updateExpense: async (id, { amount, category, date, note }) => {
    const expenses = getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) throw { response: { status: 404, data: { error: 'Expense not found' } } };

    expenses[index] = {
      ...expenses[index],
      amount: parseFloat(amount),
      category,
      date,
      note: note || '',
      updated_at: new Date().toISOString()
    };
    saveExpenses(expenses);
    return { data: expenses[index] };
  },

  deleteExpense: async (id) => {
    let expenses = getExpenses();
    expenses = expenses.filter(e => e.id !== id);
    saveExpenses(expenses);
    return { data: { deleted: true, id } };
  },

  // Budgets mock
  getCurrentBudget: async () => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const budgets = getBudgets();
    const budget = budgets.find(b => b.month.startsWith(currentMonthStr.slice(0, 7))) || { amount: 2500.00 };
    return { data: { budget: parseFloat(budget.amount), month: currentMonthStr } };
  },

  setBudget: async ({ month, amount }) => {
    const budgets = getBudgets();
    const monthStr = `${month}-01`;
    const index = budgets.findIndex(b => b.month.startsWith(month));
    const newBudget = { id: String(Date.now()), month: monthStr, amount: parseFloat(amount) };
    if (index >= 0) budgets[index] = newBudget;
    else budgets.push(newBudget);
    saveBudgets(budgets);
    return { data: newBudget };
  },

  // Analytics mock
  getSummary: async () => {
    const expenses = getExpenses();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;

    expenses.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        thisMonthTotal += parseFloat(e.amount);
      } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
        lastMonthTotal += parseFloat(e.amount);
      }
    });

    const budgets = getBudgets();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const bObj = budgets.find(b => b.month.startsWith(currentMonthStr));
    const budget = bObj ? parseFloat(bObj.amount) : 2500.00;

    const change_pct = lastMonthTotal === 0 ? null : parseFloat((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1));

    return {
      data: {
        this_month: parseFloat(thisMonthTotal.toFixed(2)),
        last_month: parseFloat(lastMonthTotal.toFixed(2)),
        change_pct,
        budget,
        budget_remaining: parseFloat((budget - thisMonthTotal).toFixed(2)),
        budget_pct_used: parseFloat(((thisMonthTotal / budget) * 100).toFixed(1))
      }
    };
  },

  getCategoryBreakdown: async ({ from, to } = {}) => {
    let expenses = getExpenses();
    const today = new Date();

    if (from && to) {
      expenses = expenses.filter(e => e.date >= from && e.date <= to);
    } else if (from) {
      expenses = expenses.filter(e => e.date >= from);
    } else if (to) {
      expenses = expenses.filter(e => e.date <= to);
    } else {
      // Default to current month
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      expenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    }

    const catMap = {};
    expenses.forEach(e => {
      if (!catMap[e.category]) catMap[e.category] = { category: e.category, total: 0, count: 0 };
      catMap[e.category].total += parseFloat(e.amount);
      catMap[e.category].count += 1;
    });

    const result = Object.values(catMap)
      .map(c => ({ ...c, total: c.total.toFixed(2) }))
      .sort((a, b) => b.total - a.total);

    return { data: result };
  },

  getOverTime: async ({ months = 6 } = {}) => {
    const expenses = getExpenses();
    const today = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const periodStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const monthTotal = expenses.reduce((sum, e) => {
        const ed = new Date(e.date);
        if (ed.getFullYear() === year && ed.getMonth() === month) {
          return sum + parseFloat(e.amount);
        }
        return sum;
      }, 0);

      result.push({ period: periodStr, total: monthTotal.toFixed(2) });
    }

    return { data: result };
  },

  getMonthOverMonth: async ({ months = 6 } = {}) => {
    return mockStorageApi.getOverTime({ months }).then(res => ({
      data: res.data.map(item => ({ month: item.period, total: item.total }))
    }));
  }
};
