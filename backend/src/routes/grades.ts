import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/grades?username=...&assignmentId=...&limit=50
// Security: allow if:
// - request is authenticated and req.user.username === username, OR
// - request includes a valid PLATFORM_TOKEN/GITHUB_TOKEN in Authorization header
const checkAccess = (req: any, username?: string) => {
  const auth = req.headers['authorization'] || '';
  const token = (auth as string).replace(/^Bearer\s+/i, '');
  const allowed = process.env.PLATFORM_TOKEN || process.env.GITHUB_TOKEN || '';
  if (token && token === allowed) return true;
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.username && req.user.username === username) return true;
  return false;
};

router.get('/', async (req: any, res) => {
  const username = req.query.username as string | undefined;
  const assignmentId = req.query.assignmentId as string | undefined;
  const limit = Math.min(Number(req.query.limit || 50), 200);

  if (!username) return res.status(400).json({ error: 'username query required' });
  if (!checkAccess(req, username)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const where: any = { githubLogin: username, tool: 'check' };
    if (assignmentId) where.assignmentId = assignmentId;

    const rows = await prisma.workspaceRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        repoFullName: true,
        branch: true,
        score: true,
        maxScore: true,
        passed: true,
        total: true,
        status: true,
        summary: true,
        assignmentId: true,
        commitSha: true,
        createdAt: true
      }
    });

    res.json(rows);
  } catch (err: any) {
    console.error('Grades fetch error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
