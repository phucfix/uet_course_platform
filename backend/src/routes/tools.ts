import express from 'express';
import { createWorkspaceRun, computeScoreFromResult } from '../services/webhookService';
import { markSubmissionIfPassed } from '../services/gradeService';

const router = express.Router();

// Simple token check middleware
const checkToken = (req: any, res: any, next: any) => {
  const auth = req.headers['authorization'] || '';
  const token = (auth as string).replace(/^Bearer\s+/i, '');
  const allowed = process.env.PLATFORM_TOKEN || process.env.GITHUB_TOKEN || '';
  if (!token || token !== allowed) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// Endpoint for Codespace to report check results directly
router.post('/report', checkToken, async (req: any, res) => {
  try {
    const { assignmentId, repoFullName, branch, tool, status, summary, rawResult, githubLogin } = req.body;

    // Compute score when applicable
    let passed: number | undefined;
    let total: number | undefined;
    let score: number | undefined;
    let maxScore: number | undefined;

    const scoreInfo = computeScoreFromResult(rawResult, 100);
    if (scoreInfo) {
      passed = scoreInfo.passed;
      total = scoreInfo.total;
      score = Math.round(scoreInfo.score * 100) / 100;
      maxScore = scoreInfo.maxScore;
    }

    const run = await createWorkspaceRun({
      githubLogin: githubLogin ?? undefined,
      repoFullName,
      branch,
      tool: tool ?? 'check',
      status: status ?? (score && maxScore && score === maxScore ? 'success' : 'fail'),
      summary,
      rawResult,
      passed,
      total,
      score,
      maxScore,
      commitSha: req.body.commitSha ?? undefined,
      assignmentId: assignmentId ?? undefined,
    });

    // Auto mark if passed threshold
    if (tool === 'check' && score != null && maxScore != null) {
      await markSubmissionIfPassed(githubLogin, assignmentId, score, maxScore, 70);
    }

    res.json({ ok: true, run });
  } catch (err: any) {
    console.error('Report error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
