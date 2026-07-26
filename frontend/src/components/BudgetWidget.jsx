import React, { useState } from 'react';
import { format } from 'date-fns';
import { upsertBudget } from '../api/expenses';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function BudgetWidget({ summary, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const { this_month = 0, budget, budget_pct_used, budget_remaining } = summary || {};
  const currentMonth = format(new Date(), 'yyyy-MM');

  const handleSave = async () => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await upsertBudget(currentMonth, amount);
      setEditing(false);
      setValue('');
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.min(budget_pct_used ?? 0, 100);
  const isOver = (budget_pct_used ?? 0) > 100;
  const isWarning = !isOver && (budget_pct_used ?? 0) > 80;

  const barColor = isOver
    ? 'linear-gradient(90deg, #f87171, #ef4444)'
    : isWarning
    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
    : 'linear-gradient(90deg, #6366f1, #8b5cf6)';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Monthly Budget</h3>
            <p className="text-white/40 text-xs">{format(new Date(), 'MMMM yyyy')}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(e => !e); setValue(budget ?? ''); }}
          className="text-xs text-brand-300 hover:text-white transition-colors font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10">
          {editing ? 'Cancel' : budget ? 'Edit budget' : '+ Set budget'}
        </button>
      </div>

      {editing ? (
        <div className="flex gap-2">
          <input type="number" step="1" min="1" className="input flex-1"
            placeholder="Enter monthly budget ($)"
            value={value} onChange={(e) => setValue(e.target.value)} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          <button className="btn-primary px-4" onClick={handleSave} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
        </div>
      ) : budget ? (
        <div className="space-y-4">
          {/* Amounts row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-white">{formatCurrency(this_month)}</p>
              <p className="text-white/40 text-xs mt-0.5">spent this month</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${isOver ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}`}>
                {isOver ? `${formatCurrency(Math.abs(budget_remaining))} over` : formatCurrency(budget_remaining)}
              </p>
              <p className="text-white/40 text-xs">{isOver ? 'over budget' : 'remaining'}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: barColor }}
                role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
            </div>
            <div className="flex justify-between text-xs text-white/40 mt-1.5">
              <span>$0</span>
              <span className={isOver ? 'text-red-400 font-semibold' : isWarning ? 'text-yellow-400 font-semibold' : 'text-white/60'}>
                {(budget_pct_used ?? 0).toFixed(0)}% used
              </span>
              <span>{formatCurrency(budget)}</span>
            </div>
          </div>

          {/* Status pill */}
          {isOver && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2">
              <span className="text-red-400 text-sm font-semibold">⚠ Over budget by {formatCurrency(Math.abs(budget_remaining))}</span>
            </div>
          )}
          {isWarning && !isOver && (
            <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-4 py-2">
              <span className="text-yellow-400 text-sm font-semibold">⚡ Approaching budget limit</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-white/40 text-sm">No budget set for this month.</p>
          <p className="text-white/30 text-xs mt-1">Click "Set budget" to add one.</p>
        </div>
      )}
    </div>
  );
}
