import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import { PrismaClient } from '@prisma/client';

const exec = promisify(_exec);
const prisma = new PrismaClient();

/**
 * Clone a GitHub repository (shallow) and attempt to read `.check50/result.json`.
 * Returns parsed JSON if the file exists, otherwise null.
 */
export async function fetchCheckResultFromRepo(repoFullName: string, branch = 'main') {
  // Create a unique temporary directory
  const tmpBase = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ghrepo-'));
  const repoUrl = `https://github.com/${repoFullName}.git`;
  try {
    // Shallow clone only the single branch to speed up and reduce bandwidth
    await exec(`git clone --depth 1 --branch ${branch} ${repoUrl} ${tmpBase}`);

    const resultPath = path.join(tmpBase, '.check50', 'result.json');
    if (!fs.existsSync(resultPath)) {
      return null;
    }

    const raw = await fs.promises.readFile(resultPath, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (err) {
      // If parsing fails, return raw string inside an object for debugging
      return { parseError: String(err), raw };
    }
  } finally {
    // Best-effort cleanup (ignore errors)
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {
      // no-op
    }
  }
}

/**
 * Parse a check result object for basic pass/total info and compute a score.
 * Returns an object with passed, total, score (0..maxScore), maxScore.
 */
export function computeScoreFromResult(result: any, maxScore = 100) {
  if (!result) return null;

  // check common fields
  const passed = typeof result.passed === 'number' ? result.passed : undefined;
  const total = typeof result.total === 'number' ? result.total : undefined;

  if (passed !== undefined && total !== undefined && total > 0) {
    const score = (passed / total) * maxScore;
    return { passed, total, score, maxScore };
  }

  // Fallback: try to infer from summary strings
  // e.g., summary: "3/5 tests passed"
  const s = (result.summary || '').toString();
  const m = s.match(/(\d+)\/(\d+)/);
  if (m) {
    const p = Number(m[1]);
    const t = Number(m[2]);
    if (t > 0) return { passed: p, total: t, score: (p / t) * maxScore, maxScore };
  }

  return null;
}

/**
 * Persist a workspace run record in the DB.
 */
export async function createWorkspaceRun(data: {
  githubLogin?: string | null;
  repoFullName: string;
  branch?: string | null;
  tool: string;
  status: string;
  summary?: string | null;
  rawResult?: any;
  passed?: number | null;
  total?: number | null;
  score?: number | null;
  maxScore?: number | null;
  commitSha?: string | null;
  assignmentId?: string | null;
}) {
  return prisma.workspaceRun.create({ data: {
    githubLogin: data.githubLogin ?? undefined,
    repoFullName: data.repoFullName,
    branch: data.branch ?? undefined,
    tool: data.tool,
    status: data.status,
    summary: data.summary ?? undefined,
    rawResult: data.rawResult ?? undefined,
    passed: data.passed ?? undefined,
    total: data.total ?? undefined,
    score: data.score ?? undefined,
    maxScore: data.maxScore ?? undefined,
    commitSha: data.commitSha ?? undefined,
    assignmentId: data.assignmentId ?? undefined,
  } });
}

export default { fetchCheckResultFromRepo, createWorkspaceRun };
