'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

type Submission = {
  id: number;
  item_type: string;
  description: string | null;
  email: string | null;
  weight_gram: number | null;
  karat: string | null;
  created_at: string;
  status: string | null;
};

const STATUS_OPTIONS = ['new', 'contacted', 'negotiating', 'closed', 'rejected'];

export default function AdminPage() {
  const [passwordInput, setPasswordInput] = useState('');
  const [authed, setAuthed] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // NEW: filter + search
  const [statusFilter, setStatusFilter] = useState<'all' | (typeof STATUS_OPTIONS)[number]>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  useEffect(() => {
    if (!authed) return;
    fetchSubmissions();
  }, [authed]);

  async function fetchSubmissions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select('id, item_type, description, email, weight_gram, karat, created_at, status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      alert('Failed to load submissions.');
    } else if (data) {
      const cleaned = data.map((row: any) => ({
        ...row,
        status: row.status || 'new',
      })) as Submission[];
      setSubmissions(cleaned);
    }

    setLoading(false);
  }

  async function handleStatusChange(id: number, newStatus: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      alert('Failed to update status. Check console for details.');
      return;
    }

    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
    );
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminPassword) {
      alert('Admin password is not configured.');
      return;
    }
    if (passwordInput === adminPassword) {
      setAuthed(true);
    } else {
      alert('Incorrect password.');
    }
  }

  function handleLogout() {
    setAuthed(false);
    setPasswordInput('');
  }

  // NEW: apply filter + search
  const filteredSubmissions = useMemo(() => {
    let list = submissions;

    if (statusFilter !== 'all') {
      list = list.filter((s) => (s.status || 'new') === statusFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((s) => {
        const item = s.item_type?.toLowerCase() || '';
        const desc = s.description?.toLowerCase() || '';
        const email = s.email?.toLowerCase() || '';
        return item.includes(term) || desc.includes(term) || email.includes(term);
      });
    }

    return list;
  }, [submissions, statusFilter, searchTerm]);

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
        <div className="bg-[#020617]/60 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-xl">
          <h1 className="text-2xl font-semibold text-white mb-2 text-center">
            MarketMint Admin
          </h1>
          <p className="text-slate-300 text-sm mb-6 text-center">
            Enter your admin password to access submissions.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm font-semibold text-white py-2.5 transition"
            >
              Enter Dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">MarketMint Admin</h1>
          <p className="text-slate-300 text-sm">
            Submissions dashboard • manually match sellers to buyers.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
        >
          Log out
        </button>
      </header>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Seller Submissions</h2>
            <p className="text-slate-400 text-xs">
              Review, tag, and track leads before sending them to buyers.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {/* Status filter */}
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  statusFilter === 'all'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-200 border-slate-700'
                }`}
              >
                All
              </button>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-full text-xs border capitalize ${
                    statusFilter === status
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Search item, description, or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <span className="text-xs text-slate-400 text-right">
              Showing {filteredSubmissions.length} of {submissions.length}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Loading submissions…</p>
        ) : filteredSubmissions.length === 0 ? (
          <p className="text-sm text-slate-300">
            No submissions match your filters yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-4 text-left font-medium">Item</th>
                  <th className="py-2 pr-4 text-left font-medium">Description</th>
                  <th className="py-2 pr-4 text-left font-medium">Email</th>
                  <th className="py-2 pr-4 text-left font-medium">Weight (g)</th>
                  <th className="py-2 pr-4 text-left font-medium">Karat</th>
                  <th className="py-2 pr-4 text-left font-medium">Created</th>
                  <th className="py-2 pr-4 text-left font-medium">Status</th>
                  <th className="py-2 pr-4 text-left font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="border-b border-slate-800 last:border-0"
                  >
                    <td className="py-2 pr-4 align-top">
                      <div className="font-medium text-slate-100">
                        {submission.item_type}
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-top max-w-xs">
                      <div className="text-slate-300">
                        {submission.description || '—'}
                      </div>
                    </td>
                   <td className="py-2 pr-4 align-top">
  <div className="flex items-center gap-2 text-slate-300">
    <span>{submission.email || '—'}</span>

    {submission.email && (
      <button
        onClick={() => {
          navigator.clipboard.writeText(submission.email || '');
          alert('Email copied to clipboard!');
        }}
        className="text-xs px-2 py-1 rounded-md border border-slate-700 hover:bg-slate-800 transition text-slate-300"
        title="Copy email"
      >
        📋
      </button>
    )}
  </div>
</td>

                    <td className="py-2 pr-4 align-top">
                      {submission.weight_gram ?? '—'}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      {submission.karat || '—'}
                    </td>
                    <td className="py-2 pr-4 align-top text-slate-400 text-xs">
                      {submission.created_at
                        ? new Date(submission.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          (submission.status || 'new') === 'new'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                            : submission.status === 'contacted'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/40'
                            : submission.status === 'negotiating'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                            : submission.status === 'closed'
                            ? 'bg-slate-500/20 text-slate-200 border border-slate-500/40'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {submission.status || 'new'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 align-top">
                      <select
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={submission.status || 'new'}
                        onChange={(e) =>
                          handleStatusChange(submission.id, e.target.value)
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
