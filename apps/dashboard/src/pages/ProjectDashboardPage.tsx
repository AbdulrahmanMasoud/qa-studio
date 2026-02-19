import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileCode,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { projectsApi, analyticsApi } from '../lib/api';
import clsx from 'clsx';

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'summary', projectId],
    queryFn: () => analyticsApi.summary(projectId!),
    enabled: !!projectId,
  });

  const { data: trends } = useQuery({
    queryKey: ['analytics', 'trends', projectId],
    queryFn: () => analyticsApi.trends(projectId!, 30),
    enabled: !!projectId,
  });

  const { data: flaky } = useQuery({
    queryKey: ['analytics', 'flaky', projectId],
    queryFn: () => analyticsApi.flaky(projectId!),
    enabled: !!projectId,
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const maxDailyRuns = trends?.dailyStats
    ? Math.max(...trends.dailyStats.map((d) => d.totalRuns), 1)
    : 1;

  return (
    <div className="p-8 overflow-auto h-full">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={`/projects/${projectId}/tests`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tests
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{project?.name} — Dashboard</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileCode className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-sm text-gray-500">Total Tests</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.totalTests ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Pass Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.passRate ?? 0}%</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Runs</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.totalRuns ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Avg Duration</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {summary?.avgDuration ? `${(summary.avgDuration / 1000).toFixed(1)}s` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Trend chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Run Trends (Last 30 Days)</h2>
          {!trends?.dailyStats || trends.dailyStats.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No run data yet</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {trends.dailyStats.map((day) => {
                const passedHeight = (day.passed / maxDailyRuns) * 100;
                const failedHeight = (day.failed / maxDailyRuns) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col justify-end items-center gap-0"
                    title={`${day.date}: ${day.passed} passed, ${day.failed} failed`}
                  >
                    <div
                      className="w-full bg-red-400 rounded-t"
                      style={{ height: `${failedHeight}%`, minHeight: day.failed > 0 ? 2 : 0 }}
                    />
                    <div
                      className="w-full bg-green-400"
                      style={{ height: `${passedHeight}%`, minHeight: day.passed > 0 ? 2 : 0 }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Test health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Test Health</h2>
          {summary && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">{summary.testStatusCounts.passing} passing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">{summary.testStatusCounts.failing} failing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-600">{summary.testStatusCounts.noRuns} no runs</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flaky tests */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold text-gray-900">Flaky Tests</h2>
        </div>
        {!flaky?.flakyTests || flaky.flakyTests.filter((t) => t.flakinessScore > 0.3).length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No flaky tests detected</p>
        ) : (
          <div className="space-y-2">
            {flaky.flakyTests
              .filter((t) => t.flakinessScore > 0.3)
              .map((test) => (
                <div
                  key={test.testId}
                  className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900 flex-1">{test.testName}</span>
                  <span className="text-sm text-yellow-700 font-medium">
                    {Math.round(test.flakinessScore * 100)}% flaky
                  </span>
                  <div className="flex gap-1">
                    {test.recentResults.slice(0, 10).map((r, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'h-3 w-3 rounded-full',
                          r.status === 'passed' ? 'bg-green-500' : 'bg-red-500'
                        )}
                        title={`${r.status} - ${r.createdAt}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
