import express from 'express';
import crypto from 'crypto';
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  createCodespaceForRepo,
  getAuthenticatedUser,
  repoExists,
  createFork,
  waitForRepo,
  getRepoDefaultAttributes,
  getTokenScopes,
  getRepoDetails,
  createCodespaceForUser,
  findUserCodespace,
  waitForCodespaceReady,
} from '../services/codespacesService';
import githubApp from '../services/githubApp';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

// Log when this module is loaded to verify the routes are mounted
console.log('codespaces routes loaded');

const prisma = new PrismaClient();

async function ensureAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Support both passport sessions and our simple session-based userId
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  const uid = (req.session as any)?.userId;
  if (!uid) return res.status(401).json({ message: 'Not authenticated' });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return res.status(401).json({ message: 'Not authenticated' });
  // attach user to the request for handlers that expect it
  (req as any).user = user;
  return next();
}

// Start - redirect user to GitHub OAuth to grant scopes
// Note: allow unauthenticated users to start the GitHub OAuth flow so
// they are redirected to GitHub to grant Codespaces scopes.
router.get('/start', async (req, res) => {
  const repo = (req.query.repo || req.query.repoFullName) as string;
  const branch = (req.query.branch as string) || undefined;
  if (!repo) return res.status(400).json({ message: 'Missing repo parameter (owner/repo)' });

  // If not authenticated, redirect to OAuth and return here after auth
  const uid = (req.session as any)?.userId;
  if (!uid && !(req.isAuthenticated && req.isAuthenticated())) {
    const returnTo = `${(process.env.BACKEND_URL || 'http://localhost:3000')}/api/codespaces/start?repo=${encodeURIComponent(repo)}${branch?`&branch=${encodeURIComponent(branch)}`:''}`;
    // Explicitly request the codespaces OAuth App so your platform/dashboard app is unaffected
    return res.redirect(`/auth/github?returnTo=${encodeURIComponent(returnTo)}&client=codespaces`);
  }

  // Authenticated: create codespace immediately
  try {
    // Owner/repo
    const [owner, repository] = repo.split('/');
    if (!owner || !repository) return res.status(400).json({ message: 'Invalid repo parameter. Expected owner/repo' });

    // Get user token from session-attached user or DB
    const user: any = (req as any).user || (req.user as any) || null;
    let dbUser: any = user;
    if (!dbUser) {
      const uid = (req.session as any).userId;
      dbUser = await prisma.user.findUnique({ where: { id: uid } }) as any;
    }
    if (!dbUser?.githubAccessToken) return res.status(401).json({ message: 'Missing GitHub access token; please re-authenticate with GitHub to grant Codespaces access.' });

    // If the user already has a codespace for this repo, reuse it
    try {
      const existing = await findUserCodespace(dbUser.githubAccessToken, owner, repository);
      if (existing) {
        const webUrl = existing.html_url || existing.web_url || existing.url || existing.access_url;
        if (webUrl) return res.redirect(webUrl);
        // If existing codespace doesn't yet have a web_url, wait briefly for readiness
        try {
          const ready = await waitForCodespaceReady(dbUser.githubAccessToken, existing.name, 45000);
          const readyUrl = ready.html_url || ready.web_url || ready.url || ready.access_url;
          if (readyUrl) return res.redirect(readyUrl);
        } catch (e) {
          // fall through to creating a new one if readiness times out
          console.warn('Existing codespace not ready, will attempt to create a new one', (e as any)?.message || e);
        }
      }
    } catch (e) {
      console.warn('Error checking for existing codespaces', (e as any)?.message || e);
    }

    const existing = await findUserCodespace(dbUser.githubAccessToken, owner, repository);
    if (existing) {
      const webUrl = existing.html_url || existing.web_url || existing.url || existing.access_url;
      if (webUrl) return res.redirect(webUrl);
      try {
        const ready = await waitForCodespaceReady(dbUser.githubAccessToken, existing.name, 45000);
        const readyUrl = ready.html_url || ready.web_url || ready.url || ready.access_url;
        if (readyUrl) return res.redirect(readyUrl);
      } catch (e) {
        console.warn('Existing codespace not ready, creating new one', (e as any)?.message || e);
      }
    }

    const cs: any = await createCodespaceForRepo(dbUser.githubAccessToken, owner, repository, branch);
    const webUrl = cs.html_url || cs.web_url || cs.url || cs.access_url;
    if (webUrl) return res.redirect(webUrl);
    return res.json({ message: 'Codespace created', codespace: cs });
  } catch (err: any) {
    console.error('Error in /start', err);
    if (err?.message && err.message.includes('403')) return res.status(403).json({ message: 'Forbidden: user may not have permission or required scopes' });
    if (err?.message && err.message.includes('404')) return res.status(404).json({ message: 'Repository not found' });
    return res.status(500).json({ message: err?.message || 'Failed to create codespace' });
  }
});

// POST /api/codespaces/create
// Body: { repoFullName: 'owner/repo', branch?: 'main' }
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { repoFullName, branch } = req.body as { repoFullName?: string; branch?: string };
    if (!repoFullName) return res.status(400).json({ message: 'Missing repoFullName in body' });

    const [owner, repository] = repoFullName.split('/');
    if (!owner || !repository) return res.status(400).json({ message: 'Invalid repoFullName, expected owner/repo' });

    const user: any = (req as any).user || (req.user as any) || null;
    let dbUser: any = user;
    if (!dbUser) {
      const uid = (req.session as any).userId;
      dbUser = await prisma.user.findUnique({ where: { id: uid } }) as any;
    }
    if (!dbUser?.githubAccessToken) return res.status(401).json({ message: 'Missing GitHub access token; please re-authenticate' });

    try {
      // Reuse existing codespace if present
      const existing = await findUserCodespace(dbUser.githubAccessToken, owner, repository);
      if (existing) {
        const webUrl = existing.html_url || existing.web_url || existing.url || existing.access_url;
        if (webUrl) return res.json({ webUrl });
        try {
          const ready = await waitForCodespaceReady(dbUser.githubAccessToken, existing.name, 45000);
          const readyUrl = ready.html_url || ready.web_url || ready.url || ready.access_url;
          if (readyUrl) return res.json({ webUrl: readyUrl });
        } catch (e) {
          console.warn('Existing codespace not ready, creating new one', (e as any)?.message || e);
        }
      }
    } catch (e) {
      console.warn('Error checking for existing codespace', (e as any)?.message || e);
    }

    const cs: any = await createCodespaceForRepo(dbUser.githubAccessToken, owner, repository, branch);
    const webUrl = cs.html_url || cs.web_url || cs.url || cs.access_url;
    if (!webUrl) return res.json({ message: 'Codespace created', codespace: cs });
    return res.json({ webUrl });
  } catch (err: any) {
    console.error('POST /create error', err);
    // Map GitHub errors to clearer responses
    if (err?.message && err.message.includes('403')) return res.status(403).json({ message: 'Forbidden: you may not have repo permissions or scopes' });
    if (err?.message && err.message.includes('404')) return res.status(404).json({ message: 'Repository not found' });
    return res.status(500).json({ message: err?.message || 'Failed to create codespace' });
  }
});



// Debug endpoint: returns installation info, masked token, default-attributes and repo metadata
router.get('/app-debug/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params as { owner: string; repo: string };

    const result: any = { owner, repo };

    // Attempt to get installation id (may throw if app not installed for that repo)
    try {
      const installationId = await githubApp.getRepoInstallationId(owner, repo);
      result.installationId = installationId;
    } catch (e: any) {
      result.installationIdError = String(e?.message || e);
    }

    // Try to create an installation token (may fallback to repo lookup inside helper)
    try {
      const token = await githubApp.getInstallationTokenForRepo(owner, repo);
      result.installationTokenMasked = token ? `${token.slice(0, 8)}...` : null;

      // Default attributes using the installation token
      try {
        const defaultAttrs = await getRepoDefaultAttributes(token, owner, repo);
        result.defaultAttributes = defaultAttrs;
      } catch (daErr: any) {
        result.defaultAttributesError = String(daErr?.message || daErr);
      }

      // Repo metadata
      try {
        const repoDetails = await getRepoDetails(owner, repo, token);
        result.repoDetails = repoDetails;
      } catch (rdErr: any) {
        result.repoDetailsError = String(rdErr?.message || rdErr);
      }

      // Organization Codespaces policies (if org)
      try {
        const policiesUrl = `https://api.github.com/orgs/${owner}/codespaces/policies`;
        const policiesRes = await fetch(policiesUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
        const policiesBody = await policiesRes.json().catch(() => ({}));
        result.orgCodespacesPolicies = { ok: policiesRes.ok, status: policiesRes.status, body: policiesBody };
      } catch (polErr: any) {
        result.orgCodespacesPoliciesError = String(polErr?.message || polErr);
      }
    } catch (tokErr: any) {
      result.installationTokenError = String(tokErr?.message || tokErr);
    }

    // If explicit installation id env is set, fetch installation info and list
    try {
      const explicitId = process.env.GITHUB_APP_INSTALLATION_ID;
      if (explicitId) {
        try {
          const jwt = githubApp.createAppJwt();
          const insUrl = `https://api.github.com/app/installations/${explicitId}`;
          const insRes = await fetch(insUrl, { headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json' } });
          const insBody = await insRes.json().catch(() => ({}));
          result.explicitInstallation = { ok: insRes.ok, status: insRes.status, body: insBody };

          const listUrl = `https://api.github.com/app/installations/${explicitId}/repositories`;
          const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json' } });
          const listBody = await listRes.json().catch(() => ({}));
          result.explicitInstallationRepos = { ok: listRes.ok, status: listRes.status, body: listBody };
        } catch (ie) {
          result.explicitInstallationError = String((ie as any)?.message || ie);
        }
      }
    } catch (e) {
      // non-fatal
    }

    return res.json(result);
  } catch (error: any) {
    console.error('App debug error', error);
    return res.status(500).json({ message: error?.message || 'debug error' });
  }
});

export default router;

