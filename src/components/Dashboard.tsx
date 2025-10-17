import { useEffect, useState } from 'react';
import { db } from '../lib/database';
import type { Metric, Suggestion } from '../lib/supabase';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Zap,
  FileCode,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [recentSuggestions, setRecentSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [metricsData, suggestionsData] = await Promise.all([
        db.metrics.getAll(30),
        db.suggestions.getRecent(10),
      ]);
      setMetrics(metricsData);
      setRecentSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalStats = metrics.reduce(
    (acc, m) => ({
      suggestions: acc.suggestions + m.total_suggestions,
      accepted: acc.accepted + m.accepted_suggestions,
      avgLatency:
        (acc.avgLatency * acc.count + m.avg_latency_ms) / (acc.count + 1),
      optimizations: acc.optimizations + m.optimization_count,
      debugs: acc.debugs + m.debug_count,
      docstrings: acc.docstrings + m.docstring_count,
      count: acc.count + 1,
    }),
    {
      suggestions: 0,
      accepted: 0,
      avgLatency: 0,
      optimizations: 0,
      debugs: 0,
      docstrings: 0,
      count: 0,
    }
  );

  const acceptanceRate =
    totalStats.suggestions > 0
      ? ((totalStats.accepted / totalStats.suggestions) * 100).toFixed(1)
      : '0';

  const languageBreakdown = metrics.reduce((acc, m) => {
    acc[m.language] = (acc[m.language] || 0) + m.total_suggestions;
    return acc;
  }, {} as Record<string, number>);

  const topLanguages = Object.entries(languageBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Performance Dashboard</h1>
          <p className="text-slate-400">
            Real-time analytics and insights for your AI-powered coding assistant
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Zap className="w-6 h-6" />}
            label="Total Suggestions"
            value={totalStats.suggestions.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Acceptance Rate"
            value={`${acceptanceRate}%`}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Avg Response Time"
            value={`${Math.round(totalStats.avgLatency)}ms`}
            color="yellow"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Optimizations"
            value={totalStats.optimizations.toLocaleString()}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Suggestion Types
            </h2>
            <div className="space-y-4">
              <TypeBar
                icon={<FileCode className="w-4 h-4" />}
                label="Code Completions"
                value={totalStats.suggestions - totalStats.optimizations - totalStats.debugs - totalStats.docstrings}
                total={totalStats.suggestions}
                color="blue"
              />
              <TypeBar
                icon={<TrendingUp className="w-4 h-4" />}
                label="Optimizations"
                value={totalStats.optimizations}
                total={totalStats.suggestions}
                color="green"
              />
              <TypeBar
                icon={<AlertCircle className="w-4 h-4" />}
                label="Debug Assists"
                value={totalStats.debugs}
                total={totalStats.suggestions}
                color="red"
              />
              <TypeBar
                icon={<BookOpen className="w-4 h-4" />}
                label="Documentation"
                value={totalStats.docstrings}
                total={totalStats.suggestions}
                color="yellow"
              />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Top Languages</h2>
            {topLanguages.length > 0 ? (
              <div className="space-y-3">
                {topLanguages.map(([lang, count]) => (
                  <div key={lang} className="flex items-center justify-between">
                    <span className="text-slate-300 capitalize">{lang}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(count / totalStats.suggestions) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-slate-400 text-sm w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 text-center py-8">
                No language data yet. Start coding to see statistics!
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Suggestions</h2>
          {recentSuggestions.length > 0 ? (
            <div className="space-y-3">
              {recentSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded capitalize">
                        {suggestion.suggestion_type}
                      </span>
                      <span className="text-slate-400 text-sm capitalize">
                        {suggestion.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{suggestion.latency_ms}ms</span>
                      {suggestion.accepted ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{suggestion.explanation}</p>
                  <div className="bg-slate-950 rounded p-2 overflow-x-auto">
                    <code className="text-xs text-green-400">
                      {suggestion.suggested_code.substring(0, 100)}
                      {suggestion.suggested_code.length > 100 && '...'}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-8">
              No suggestions yet. Start using the editor to see AI suggestions!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className={`inline-flex p-3 rounded-lg mb-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  );
}

function TypeBar({
  icon,
  label,
  value,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-300">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-slate-400 text-sm">{value}</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
