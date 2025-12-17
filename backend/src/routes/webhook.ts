import express from 'express';
import { fetchCheckResultFromRepo, createWorkspaceRun, computeScoreFromResult } from '../services/webhookService';
import { markSubmissionIfPassed } from '../services/gradeService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// GitHub will POST push events here. We keep logic simple:
// - If push includes a branch called `submit`, we record a 'submit' WorkspaceRun
// - Otherwise, try to clone the repo at the pushed branch and read `.check50/result.json`.
router.post('/github', async (req, res) => {
  const event = req.body || {};
  try {
    // Basic checks: require repository and ref
    if (!event.repository || !event.ref) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const repoFullName = event.repository.full_name as string;
    const branch = String(event.ref).replace('refs/heads/', '');
    const githubLogin = event.pusher?.name ?? event.sender?.login ?? null;

    // If push to `submit` branch, create a submit record (no cloning required)
    if (branch === 'submit') {
      await createWorkspaceRun({
        githubLogin: githubLogin ?? undefined,
        repoFullName,
        branch,
        tool: 'submit',
        status: 'submitted',
        summary: 'User pushed to submit branch',
      });

      // After a submit push, check the latest check run for this repo+user and auto-mark
      try {
        const latest = await prisma.workspaceRun.findFirst({
          where: { repoFullName, githubLogin, tool: 'check' },
          orderBy: { createdAt: 'desc' }
        });
        if (latest && latest.score != null && latest.maxScore != null) {
          await markSubmissionIfPassed(githubLogin, latest.assignmentId, latest.score, latest.maxScore, 70);
        }
      } catch (err) {
        // don't block webhook if auto-mark fails
        console.error('Auto-mark after submit failed:', err);
      }

      return res.json({ ok: true, note: 'submit recorded' });
    }

    // Otherwise, attempt to fetch check result file
    const checkResult = await fetchCheckResultFromRepo(repoFullName, branch);
    if (checkResult) {
      // Compute score if possible
      const scoreInfo = computeScoreFromResult(checkResult, 100);
      let status = 'no_result';
      let summary: string | undefined = undefined;
      let passed: number | undefined = undefined;
      let total: number | undefined = undefined;
      let score: number | undefined = undefined;
      let maxScore: number | undefined = undefined;

      if (scoreInfo) {
        passed = scoreInfo.passed;
        total = scoreInfo.total;
        score = Math.round(scoreInfo.score * 100) / 100; // round to 2 decimals
        maxScore = scoreInfo.maxScore;
        status = passed === total ? 'success' : 'fail';
        summary = `${passed}/${total} tests passed`;
      }

      await createWorkspaceRun({
        githubLogin: githubLogin ?? undefined,
        repoFullName,
        branch,
        tool: 'check',
        status,
        summary,
        rawResult: checkResult,
        passed,
        total,
        score,
        maxScore,
        commitSha: event.head_commit?.id ?? undefined,
        assignmentId: event.repository?.name ?? undefined,
      });

      return res.json({ ok: true, note: 'check result recorded' });
    }

    // No result file found — still record an event for auditing
    await createWorkspaceRun({
      githubLogin: githubLogin ?? undefined,
      repoFullName,
      branch,
      tool: 'check',
      status: 'no_result',
      summary: 'No .check50/result.json found in repo',
    });

    return res.json({ ok: true, note: 'no result found' });
  } catch (err: any) {
    console.error('Webhook handling error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
