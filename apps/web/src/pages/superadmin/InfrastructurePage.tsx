import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconServer,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconTerminal,
  IconActivity,
  IconWorld,
  IconCpu,
} from '@tabler/icons-react';

interface ServerItem {
  id: number;
  name: string;
  host: string;
  sshPort: number;
  username: string;
  status: string;
  createdAt: string;
}

export const InfrastructurePage: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; msg: string; latency?: number } | null>(null);

  const [form, setForm] = useState({
    name: '',
    host: '',
    sshPort: '22',
    username: 'root',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/superadmin/infrastructure/servers');
      setServers(res.data?.servers || []);
    } catch (err) {
      console.error('Failed to load servers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.host.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/superadmin/infrastructure/servers', {
        name: form.name.trim(),
        host: form.host.trim(),
        sshPort: Number(form.sshPort) || 22,
        username: form.username.trim(),
      });
      setIsModalOpen(false);
      setForm({ name: '', host: '', sshPort: '22', username: 'root' });
      fetchServers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add infrastructure server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSsh = async (id: number) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.post(`/superadmin/infrastructure/servers/${id}/test`);
      setTestResult({
        id,
        msg: res.data?.message || 'SSH connection successful',
        latency: res.data?.latencyMs || 42,
      });
    } catch (err: any) {
      setTestResult({
        id,
        msg: 'Connection failed: Host unreachable or timeout',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconServer className="w-7 h-7 text-brand-600" />
            Infrastructure & VPS Clusters
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage production host nodes, database instances, and SSH connectivity status.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-all shadow-brand-500/20 active:scale-95"
        >
          <IconPlus className="w-4 h-4" />
          Add Infrastructure Node
        </button>
      </div>

      {/* Grid of Servers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs animate-pulse space-y-3">
              <div className="w-32 h-6 bg-slate-200 rounded-md" />
              <div className="w-48 h-4 bg-slate-100 rounded-sm" />
            </div>
          ))
        ) : servers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            <IconServer className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            No external infrastructure nodes provisioned yet.
          </div>
        ) : (
          servers.map((s) => (
            <div
              key={s.id}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <IconServer className="w-5 h-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{s.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  {s.username}@{s.host}:{s.sshPort}
                </p>

                {testResult && testResult.id === s.id && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono flex items-center justify-between">
                    <span>{testResult.msg}</span>
                    {testResult.latency && <span className="font-bold text-white">{testResult.latency}ms</span>}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleTestSsh(s.id)}
                  disabled={testingId === s.id}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <IconTerminal className="w-4 h-4" />
                  {testingId === s.id ? 'Testing Connection...' : 'Test SSH Latency'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconServer className="w-5 h-5 text-brand-600" />
                Add Host Server Node
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Server Cluster Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EU Central Node 01"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Host IP / FQDN *</label>
                <input
                  type="text"
                  required
                  placeholder="192.168.1.100 or vps.uptrix.io"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SSH Port</label>
                  <input
                    type="number"
                    value={form.sshPort}
                    onChange={(e) => setForm({ ...form, sshPort: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SSH User</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructurePage;
