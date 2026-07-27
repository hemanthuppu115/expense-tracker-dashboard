// Mock storage & API implementation for offline/demo mode (e.g. GitHub Pages)

const MOCK_STORAGE_USERS = 'expense_tracker_demo_users_v2';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(MOCK_STORAGE_USERS, JSON.stringify(users));
}

function seedInitialData() {
  let users = getUsers();
  const demoUserExists = users.some(u => u.email === 'demo@example.com');

  if (!demoUserExists) {
    const demoUser = {
      id: 'demo-user-1',
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'password123',
    };
    users.push(demoUser);
    saveUsers(users);

    // Seed sample expenses for demo user ONLY
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    
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
    localStorage.setItem(`expense_tracker_user_demo-user-1_expenses`, JSON.stringify(initialExpenses));

    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const initialBudgets = [
      { id: 'b1', month: currentMonthStr, amount: 2500.00 }
    ];
    localStorage.setItem(`expense_tracker_user_demo-user-1_budgets`, JSON.stringify(initialBudgets));
  }
}

seedInitialData();

function getCurrentUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const userId = token.replace('mock-jwt-', '');
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  return user || null;
}

function getUserExpenses(userId) {
  try {
    return JSON.parse(localStorage.getItem(`expense_tracker_user_${userId}_expenses`)) || [];
  } catch {
    return [];
  }
}

function saveUserExpenses(userId, expenses) {
  localStorage.setItem(`expense_tracker_user_${userId}_expenses`, JSON.stringify(expenses));
}

function getUserBudgets(userId) {
  try {
    return JSON.parse(localStorage.getItem(`expense_tracker_user_${userId}_budgets`)) || [];
  } catch {
    return [];
  }
}

function saveUserBudgets(userId, budgets) {
  localStorage.setItem(`expense_tracker_user_${userId}_budgets`, JSON.stringify(budgets));
}

function authError(message = 'Unauthorized. Please log in.', status = 401) {
  return { response: { status, data: { error: message } } };
}

export const mockStorageApi = {
  // Auth mock
  signup: async ({ name, email, password }) => {
    if (!email || !password || !name) {
      throw authError('All fields are required.', 400);
    }
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw authError('An account with that email already exists.', 409);
    }
    const userId = 'user-' + Date.now();
    const newUser = { id: userId, name, email: email.toLowerCase(), password };
    users.push(newUser);
    saveUsers(users);

    const token = `mock-jwt-${userId}`;
    const userSummary = { id: userId, name: newUser.name, email: newUser.email };
    return { data: { token, user: userSummary } };
  },

  login: async ({ email, password }) => {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user || user.password !== password) {
      throw authError('Invalid email or password.', 401);
    }
    const token = `mock-jwt-${user.id}`;
    const userSummary = { id: user.id, name: user.name, email: user.email };
    return { data: { token, user: userSummary } };
  },

  getMe: async () => {
    const user = getCurrentUser();
    if (!user) {
      throw authError('Unauthorized. Please log in.', 401);
    }
    return { data: { user: { id: user.id, name: user.name, email: user.email } } };
  },

  // Expenses mock
  getExpenses: async (params = {}) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    let expenses = getUserExpenses(user.id);
    const { category, from, to, page = 1, limit = 50 } = params;

    if (category) expenses = expenses.filter(e => e.category === category);
    if (from) expenses = expenses.filter(e => e.date >= from);
    if (to) expenses = expenses.filter(e => e.date <= to);

    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = expenses.length;
    const start = (page - 1) * limit;
    const paginated = expenses.slice(start, start + limit);

    return {
      data: {
        data: paginated,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) || 1 }
      }
    };
  },

  getExpenseById: async (id) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    const expenses = getUserExpenses(user.id);
    const exp = expenses.find(e => e.id === id);
    if (!exp) throw authError('Expense not found', 404);
    return { data: exp };
  },

  createExpense: async ({ amount, category, date, note }) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    const expenses = getUserExpenses(user.id);
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
    saveUserExpenses(user.id, expenses);
    return { data: newExp, status: 201 };
  },

  updateExpense: async (id, { amount, category, date, note }) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    const expenses = getUserExpenses(user.id);
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) throw authError('Expense not found', 404);

    expenses[index] = {
      ...expenses[index],
      amount: parseFloat(amount),
      category,
      date,
      note: note || '',
      updated_at: new Date().toISOString()
    };
    saveUserExpenses(user.id, expenses);
    return { data: expenses[index] };
  },

  deleteExpense: async (id) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    let expenses = getUserExpenses(user.id);
    expenses = expenses.filter(e => e.id !== id);
    saveUserExpenses(user.id, expenses);
    return { data: { deleted: true, id } };
  },

  // Budgets mock
  getCurrentBudget: async () => {
    const user = getCurrentUser();
    if (!user) throw authError();

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const budgets = getUserBudgets(user.id);
    const budget = budgets.find(b => b.month.startsWith(currentMonthStr.slice(0, 7)));
    return { data: { budget: budget ? parseFloat(budget.amount) : null, month: currentMonthStr } };
  },

  setBudget: async ({ month, amount }) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    const budgets = getUserBudgets(user.id);
    const monthStr = `${month}-01`;
    const index = budgets.findIndex(b => b.month.startsWith(month));
    const newBudget = { id: String(Date.now()), month: monthStr, amount: parseFloat(amount) };
    if (index >= 0) budgets[index] = newBudget;
    else budgets.push(newBudget);
    saveUserBudgets(user.id, budgets);
    return { data: newBudget };
  },

  // Analytics mock
  getSummary: async () => {
    const user = getCurrentUser();
    if (!user) throw authError();

    const expenses = getUserExpenses(user.id);
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

    const budgets = getUserBudgets(user.id);
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const bObj = budgets.find(b => b.month.startsWith(currentMonthStr));
    const budget = bObj ? parseFloat(bObj.amount) : null;

    const change_pct = lastMonthTotal === 0 ? null : parseFloat((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1));

    return {
      data: {
        this_month: parseFloat(thisMonthTotal.toFixed(2)),
        last_month: parseFloat(lastMonthTotal.toFixed(2)),
        change_pct,
        budget,
        budget_remaining: budget !== null ? parseFloat((budget - thisMonthTotal).toFixed(2)) : null,
        budget_pct_used: budget ? parseFloat(((thisMonthTotal / budget) * 100).toFixed(1)) : 0
      }
    };
  },

  getCategoryBreakdown: async ({ from, to } = {}) => {
    const user = getCurrentUser();
    if (!user) throw authError();

    let expenses = getUserExpenses(user.id);
    const today = new Date();

    if (from && to) {
      expenses = expenses.filter(e => e.date >= from && e.date <= to);
    } else if (from) {
      expenses = expenses.filter(e => e.date >= from);
    } else if (to) {
      expenses = expenses.filter(e => e.date <= to);
    } else {
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
    const user = getCurrentUser();
    if (!user) throw authError();

    const expenses = getUserExpenses(user.id);
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
