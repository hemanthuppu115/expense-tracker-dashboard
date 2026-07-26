import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { getExpenses, deleteExpense } from '../api/expenses';
import ExpenseModal from '../components/ExpenseModal';

const CATEGORIES = [
  '', 'Food & Dining', 'Transport', 'Housing', 'Utilities',
  'Healthcare', 'Entertainment', 'Shopping', 'Travel', 'Education', 'Other',
];

const CATEGORY_STYLE = {
  'Food & Dining': { bg: 'rgba(249,115,22,0.2)',  color: '#fb923c', icon: '🍔' },
  'Transport':     { bg: 'rgba(59,130,246,0.2)',   color: '#60a5fa', icon: '🚗' },
  'Housing':       { bg: 'rgba(139,92,246,0.2)',   color: '#a78bfa', icon: '🏠' },
  'Utilities':     { bg: 'rgba(234,179,8,0.2)',    color: '#facc15', icon: '⚡' },
  'Healthcare':    { bg: 'rgba(34,197,94,0.2)',    color: '#4ade80', icon: '💊' },
  'Entertainment': { bg: 'rgba(236,72,153,0.2)',   color: '#f472b6', icon: '🎬' },
  'Shopping':      { bg: 'rgba(239,68,68,0.2)',    color: '#f87171', icon: '🛍️' },
  'Travel':        { bg: 'rgba(20,184,166,0.2)',   color: '#2dd4bf', icon: '✈️' },
  'Education':     { bg: 'rgba(99,102,241,0.2)',   color: '#818cf8', icon: '📚' },
  'Other':         { bg: 'rgba(148,163,184,0.2)',  color: '#94a3b8', icon: '📦' },
};

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', category: '' });
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (filters.from) params.from = filters.from;
      if (filters.to)   params.to   = filters.to;
      if (filters.category) params.category = filters.category;
      const { data } = await getExpenses(params);
      setExpenses(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try { await deleteExpense(deleteConfirm.id); setDeleteConfirm(null); load(); }
    catch (err) { console.error(err); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Expenses</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {pagination.total} record{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary gap-2" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add expense
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Filters</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="from">From date</label>
            <input id="from" name="from" type="date" className="input"
              value={filters.from} onChange={handleFilterChange} />
          </div>
          <div>
            <label className="label" htmlFor="to">To date</label>
            <input id="to" name="to" type="date" className="input"
              value={filters.to} onChange={handleFilterChange} />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input"
              value={filters.category} onChange={handleFilterChange}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All categories'}</option>)}
            </select>
          </div>
        </div>
        {(filters.from || filters.to || filters.category) && (
          <button className="mt-3 text-xs text-brand-300 hover:text-white transition-colors font-semibold flex items-center gap-1"
            onClick={() => { setFilters({ from: '', to: '', category: '' }); setPage(1); }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Expenses list */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-brand-500 animate-spin" />
            <p className="text-white/30 text-sm">Loading expenses…</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-white/60 text-base font-semibold">No expenses found</p>
            <p className="text-white/30 text-sm mt-1">
              {filters.from || filters.to || filters.category ? 'Try adjusting your filters.' : 'Add your first expense to get started.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 px-5 py-3 text-xs font-bold text-white/30 uppercase tracking-wider"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-4">Note</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {expenses.map((e) => {
                const style = CATEGORY_STYLE[e.category] || CATEGORY_STYLE['Other'];
                return (
                  <div key={e.id}
                    className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-white/5 transition-colors duration-150 group">
                    {/* Date */}
                    <div className="col-span-5 sm:col-span-2">
                      <p className="text-white/80 text-sm font-medium">
                        {format(parseISO(e.date), 'MMM d')}
                      </p>
                      <p className="text-white/30 text-xs">{format(parseISO(e.date), 'yyyy')}</p>
                    </div>

                    {/* Category */}
                    <div className="col-span-7 sm:col-span-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: style.bg, color: style.color }}>
                        <span>{style.icon}</span>
                        <span className="hidden sm:inline">{e.category}</span>
                      </span>
                    </div>

                    {/* Note — hidden on mobile */}
                    <div className="hidden sm:block col-span-4 text-white/50 text-sm truncate pr-2">
                      {e.note || <span className="text-white/20">—</span>}
                    </div>

                    {/* Amount */}
                    <div className="hidden sm:block col-span-2 text-right">
                      <span className="text-white font-bold text-sm">{formatCurrency(e.amount)}</span>
                    </div>

                    {/* Actions */}
                    <div className="hidden sm:flex col-span-1 items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(e); setModalOpen(true); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-brand-300 hover:bg-brand-500/20 transition-all"
                        title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(e)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/20 transition-all"
                        title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Mobile: amount + actions */}
                    <div className="sm:hidden col-span-12 flex items-center justify-between mt-1.5 pt-1.5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-white/40 text-xs truncate mr-2">{e.note || '—'}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-white font-bold text-sm">{formatCurrency(e.amount)}</span>
                        <button onClick={() => { setEditing(e); setModalOpen(true); }}
                          className="text-white/40 hover:text-brand-300 text-xs transition-colors">Edit</button>
                        <button onClick={() => setDeleteConfirm(e)}
                          className="text-white/40 hover:text-red-400 text-xs transition-colors">Del</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/40 text-xs">Page {page} of {pagination.pages}</span>
                <div className="flex gap-2">
                  <button className="btn-secondary py-1.5 px-3 text-xs" disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}>← Previous</button>
                  <button className="btn-secondary py-1.5 px-3 text-xs" disabled={page >= pagination.pages}
                    onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ExpenseModal expense={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); load(); }} />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 space-y-4 animate-slide-up"
            style={{ background: 'rgba(15,12,41,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(239,68,68,0.2)' }}>🗑️</div>
              <div>
                <h2 className="font-bold text-white">Delete expense?</h2>
                <p className="text-white/40 text-xs">This cannot be undone</p>
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-white font-bold text-lg">{formatCurrency(deleteConfirm.amount)}</p>
              <p className="text-white/50 text-sm">{deleteConfirm.category}</p>
              {deleteConfirm.note && <p className="text-white/30 text-xs mt-1">{deleteConfirm.note}</p>}
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading
                  ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Deleting…</>
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
