import axios from 'axios';
import { mockStorageApi } from './mockStorage';

const isStaticHosting = typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('github.io') || window.location.hostname !== 'localhost');

const hasCustomApiUrl = !!import.meta.env.VITE_API_URL;
let forceDemoMode = isStaticHosting && !hasCustomApiUrl;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Router helper to route endpoint requests to mockStorageApi
async function handleMockRoute(method, url, data, params) {
  const cleanUrl = url.replace(/^\/api/, '');

  // Auth routes
  if (cleanUrl === '/auth/signup') return mockStorageApi.signup(data);
  if (cleanUrl === '/auth/login') return mockStorageApi.login(data);
  if (cleanUrl === '/auth/me') return mockStorageApi.getMe();

  // Expenses routes
  if (cleanUrl === '/expenses' && method === 'get') return mockStorageApi.getExpenses(params);
  if (cleanUrl === '/expenses' && method === 'post') return mockStorageApi.createExpense(data);
  if (cleanUrl.match(/^\/expenses\/[^/]+$/) && method === 'get') {
    const id = cleanUrl.split('/')[2];
    return mockStorageApi.getExpenseById(id);
  }
  if (cleanUrl.match(/^\/expenses\/[^/]+$/) && method === 'put') {
    const id = cleanUrl.split('/')[2];
    return mockStorageApi.updateExpense(id, data);
  }
  if (cleanUrl.match(/^\/expenses\/[^/]+$/) && method === 'delete') {
    const id = cleanUrl.split('/')[2];
    return mockStorageApi.deleteExpense(id);
  }

  // Budgets routes
  if ((cleanUrl === '/budgets/current' || cleanUrl === '/budgets') && method === 'get') return mockStorageApi.getCurrentBudget();
  if (cleanUrl === '/budgets' && method === 'post') return mockStorageApi.setBudget(data);
  if (cleanUrl.match(/^\/budgets\/[^/]+$/) && (method === 'put' || method === 'post')) {
    const month = cleanUrl.split('/')[2];
    return mockStorageApi.setBudget({ month, amount: data.amount });
  }

  // Analytics routes
  if (cleanUrl === '/analytics/summary' && method === 'get') return mockStorageApi.getSummary();
  if (cleanUrl === '/analytics/by-category' && method === 'get') return mockStorageApi.getCategoryBreakdown(params);
  if (cleanUrl === '/analytics/over-time' && method === 'get') return mockStorageApi.getOverTime(params);
  if (cleanUrl === '/analytics/month-over-month' && method === 'get') return mockStorageApi.getMonthOverMonth(params);

  throw new Error(`Unhandled mock route: ${method.toUpperCase()} ${cleanUrl}`);
}

// Wrapper around Axios methods to provide automatic fallback to mockStorageApi
const client = {
  get: async (url, config = {}) => {
    if (forceDemoMode) return handleMockRoute('get', url, null, config?.params);
    try {
      return await api.get(url, config);
    } catch (err) {
      if (!hasCustomApiUrl && (err.code === 'ERR_NETWORK' || err.response?.status === 404)) {
        forceDemoMode = true;
        return handleMockRoute('get', url, null, config?.params);
      }
      throw err;
    }
  },

  post: async (url, data, config = {}) => {
    if (forceDemoMode) return handleMockRoute('post', url, data, config?.params);
    try {
      return await api.post(url, data, config);
    } catch (err) {
      if (!hasCustomApiUrl && (err.code === 'ERR_NETWORK' || err.response?.status === 404)) {
        forceDemoMode = true;
        return handleMockRoute('post', url, data, config?.params);
      }
      throw err;
    }
  },

  put: async (url, data, config = {}) => {
    if (forceDemoMode) return handleMockRoute('put', url, data, config?.params);
    try {
      return await api.put(url, data, config);
    } catch (err) {
      if (!hasCustomApiUrl && (err.code === 'ERR_NETWORK' || err.response?.status === 404)) {
        forceDemoMode = true;
        return handleMockRoute('put', url, data, config?.params);
      }
      throw err;
    }
  },

  delete: async (url, config = {}) => {
    if (forceDemoMode) return handleMockRoute('delete', url, null, config?.params);
    try {
      return await api.delete(url, config);
    } catch (err) {
      if (!hasCustomApiUrl && (err.code === 'ERR_NETWORK' || err.response?.status === 404)) {
        forceDemoMode = true;
        return handleMockRoute('delete', url, null, config?.params);
      }
      throw err;
    }
  },

  isDemoMode: () => forceDemoMode,
  interceptors: api.interceptors
};

export default client;
