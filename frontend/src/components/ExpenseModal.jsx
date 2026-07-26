import React, { useState, useEffect } from 'react';
import { createExpense, updateExpense } from '../api/expenses';

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Utilities',
  'Healthcare', 'Entertainment', 'Shopping', 'Travel',
  'Education', 'Other',
];

const CATEGORY_ICONS = {
  'Food & Dining': '🍔', 'Transport': '🚗', 'Housing': '🏠',
  'Utilities': '⚡', 'Healthcare': '💊', 'Entertainment': '🎬',
  'Shopping': '🛍️', 'Travel': '✈️', 'Education': '📚', 'Other': '📦',
};

const empty = { amount: '', category: 'Food & Dining', date: '', note: '' };

export default function ExpenseModal({ expense, onClose, onSaved }) {
  const isEdit = Boolean(expense);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({ amount: expense.amount, category: expense.category,
        date: expense.date?.split('T')[0] ?? expense.date, note: expense.note || '' });
    } else {
      const y = new Date().getFullYear();
      const m = String(new Date().getMonth()+1).padStart(2,'0');
      const d = String(new Date().getDate()).padStart(2,'0');
      setForm({ ...empty, date: `${y}-${m}-${d}` });
    }
  }, [expense]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (isNaN(payload.amount) || payload.amount <= 0) {
      setError('Amount must be a positive number.'); return;
    }
    setLoading(true);
    try {
      const saved = isEdit
        ? (await updateExpense(expense.id, payload)).data
        : (await createExpense(payload)).data;
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-slide-up rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

        {/* Gradient header */}
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: isEdit ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {isEdit ? '✏️' : '➕'}
            </div>
            <h2 id="modal-title" className="font-bold text-white text-base">
              {isEdit ? 'Edit Expense' : 'Add Expense'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="amount">Amount ($)</label>
              <input id="amount" name="amount" type="number" step="0.01" min="0.01"
                required className="input text-lg font-bold" placeholder="0.00"
                value={form.amount} onChange={handleChange} />
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" name="date" type="date" required className="input"
                value={form.date} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, category: c }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    form.category === c
                      ? 'text-white border border-brand-400'
                      : 'text-white/50 border border-white/10 hover:border-white/30 hover:text-white/80'
                  }`}
                  style={form.category === c ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.3))' } : { background: 'rgba(255,255,255,0.05)' }}>
                  <span>{CATEGORY_ICONS[c]}</span>
                  <span className="truncate">{c}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="note">
              Note <span className="text-white/30 normal-case font-normal">(optional)</span>
            </label>
            <input id="note" name="note" type="text" className="input"
              placeholder="What was this for?" maxLength={500}
              value={form.note} onChange={handleChange} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Saving…</>
                : isEdit ? 'Save changes' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
