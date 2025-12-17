
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '../lib/api';

interface GradeRow {
  id: string;
  score?: number | null;
  maxScore?: number | null;
  passed?: boolean | null;
  summary?: string | null;
  assignmentId?: string | null;
  createdAt?: string | null;
}

export default function GradeBadge({ username, assignmentId }: { username?: string; assignmentId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['grades', username, assignmentId],
    queryFn: async () => {
      if (!username) return [] as GradeRow[];
      const res = await gradesApi.getGrades(username, assignmentId, 1);
      return res.data as GradeRow[];
    },
    enabled: !!username && !!assignmentId,
  });

  if (!assignmentId) return null;
  if (isLoading) return <span className="text-xs text-gray-400">Loading…</span>;
  if (!data || data.length === 0) return <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full">–</span>;

  const latest = data[0];
  const score = typeof latest.score === 'number' ? latest.score : null;
  const maxScore = typeof latest.maxScore === 'number' ? latest.maxScore : null;
  const pct = (score !== null && maxScore) ? Math.round((score / maxScore) * 100) : score !== null ? Math.round(score) : null;
  const passed = latest.passed || (pct !== null && pct >= 70);

  const title = latest.summary || (score !== null && maxScore ? `Grade: ${score}/${maxScore} (${pct}%)` : 'Grade available');

  return (
    <div className="flex items-center gap-2" title={title}>
      <span className="px-2 py-0.5 bg-white border text-xs rounded">{score !== null && maxScore ? `${score}/${maxScore}` : score !== null ? `${score}` : '—'}</span>
      {passed ? (
        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">✅ Complete</span>
      ) : (
        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full">⚠️ Incomplete</span>
      )}
    </div>
  );
}
