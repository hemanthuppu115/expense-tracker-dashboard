import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';
import { getSummary, getByCategory, getOverTime } from '../api/expenses';
import BudgetWidget from '../components/BudgetWidget';

const CHART_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
  '#f43f5e', '#06b6d4',
];

const STAT_CARDS = [
  { key: 'this_month',    label: 'This Month',    icon: '📈', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', glow: 'rgba(99,102,241,0.4)' },
  { key: 'last_month',    label: 'Last Month',    icon: '📅', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', glow: 'rgba(59,130,246,0.4)' },
  { key: 'transactions',  label: 'Transactions',  icon: '🧾', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', glow: 'rgba(20,184,166,0.4)' },
  { key: 'top_category',  label: 'Top Category',  icon: '🏆', gradient: 'linear-gradient(135deg, #ec4899, #be185d)', glow: 'rgba(236,72,153,0.4)' },
];

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function formatCurrencyFull(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.15)' }}>
      <p className="text-white/60 text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrencyFull(payload[0].value)}</p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.15)' }}>
      <p className="text-white font-bold">{payload[0].name}</p>
      <p className="text-white/70">{formatCurrencyFull(payload[0].value)}</p>
    </div>
  );
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [overTimeData, setOverTimeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, timeRes] = await Promise.all([
        getSummary(), getByCategory(), getOverTime({ months: 6 }),
      ]);
      setSummary(sumRes.data);
      setCategoryData(catRes.data);
      setOverTimeData(timeRes.data.map(row => ({
        ...row, label: format(parseISO(row.period), 'MMM yy'), total: parseFloat(row.total),
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-brand-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">💰</div>
        </div>
      </div>
    );
  }

  const { this_month = 0, last_month = 0, change_pct } = summary || {};
  const txCount = categoryData.reduce((s, c) => s + (parseInt(c.count) || 0), 0);
  const changePct = change_pct === null ? null : change_pct;
  const changeUp = changePct !== null && changePct > 0;

  const statValues = {
    this_month:   formatCurrency(this_month),
    last_month:   formatCurrency(last_month),
    transactions: txCount.toString(),
    top_category: categoryData[0]?.category || '—',
  };
  const statSubs = {
    this_month:   changePct !== null ? `${changeUp ? '▲' : '▼'} ${Math.abs(changePct)}% vs last month` : 'No prior data',
    last_month:   'previous month',
    transactions: 'this month',
    top_category: categoryData[0] ? formatCurrencyFull(categoryData[0].total) : '',
  };
  const statSubColors = {
    this_month: changePct === null ? 'text-white/40' : changeUp ? 'text-red-400' : 'text-green-400',
  };

  const hasNoData = categoryData.length === 0 && overTimeData.every(d => d.total === 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-white/60 text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live data
        </div>
      </div>

      {hasNoData && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-white/60 text-lg font-semibold">No expenses yet</p>
          <p className="text-white/30 text-sm mt-1">
            Head to <a href="/expenses" className="text-brand-300 hover:text-white">Expenses</a> to add your first entry
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon, gradient, glow }) => (
          <div key={key} className="relative rounded-2xl p-5 overflow-hidden group hover:-translate-y-1 transition-transform duration-200"
            style={{ background: gradient, boxShadow: `0 8px 32px ${glow}` }}>
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">{label}</span>
                <span className="text-xl">{icon}</span>
              </div>
              <p className="text-2xl font-black text-white leading-tight">{statValues[key]}</p>
              {statSubs[key] && (
                <p className={`text-xs mt-1 font-medium ${statSubColors[key] || 'text-white/60'}`}>
                  {statSubs[key]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Budget widget */}
      <BudgetWidget summary={summary} onUpdated={load} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Spend over time — Area chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white">Spend Over Time</h3>
              <p className="text-white/40 text-xs mt-0.5">Last 6 months</p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(99,102,241,0.2)' }}>📈</div>
          </div>
          {overTimeData.every(d => d.total === 0) ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-white/30 text-sm">No historical data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overTimeData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(1)}k`} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Spend"
                  stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#312e81' }}
                  activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spend by category — Donut */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white">Spend by Category</h3>
              <p className="text-white/40 text-xs mt-0.5">This month</p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(236,72,153,0.2)' }}>🥧</div>
          </div>
          {categoryData.length === 0 ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-white/30 text-sm">No data for this month</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="total" nameKey="category"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                  label={({ percent }) => percent > 0.07 ? `${(percent*100).toFixed(0)}%` : ''}
                  labelLine={false}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                  ))}
                </Pie>
                <PieTooltip content={<CustomPieTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category bar breakdown */}
      {categoryData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white">Category Breakdown</h3>
              <p className="text-white/40 text-xs mt-0.5">Spending by category this month</p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(20,184,166,0.2)' }}>📊</div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 36)}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(1)}k`}
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" width={115}
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="total" name="Total" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
