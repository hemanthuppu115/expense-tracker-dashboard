import api from './client';

export const getExpenses = (params) => api.get('/expenses', { params });
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

export const getSummary = () => api.get('/analytics/summary');
export const getByCategory = (params) => api.get('/analytics/by-category', { params });
export const getOverTime = (params) => api.get('/analytics/over-time', { params });

export const getBudgets = () => api.get('/budgets');
export const upsertBudget = (month, amount) => api.put(`/budgets/${month}`, { amount });
