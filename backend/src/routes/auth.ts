import express from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import githubOAuth from '../services/githubOAuth';

const prisma = new PrismaClient();
const router = express.Router();

// GET /auth/github -> redirect user to GitHub OAuth authorize URL
router.get('/github', (req, res) => {
  const returnTo = (req.query.returnTo as string) || req.headers.referer || process.env.FRONTEND_URL || '/';
  const client = (req.query.client as string) || undefined; // e.g. 'codespaces' or undefined
  // Keep a random nonce in state to mitigate CSRF and include returnTo and client for callback handling
  const state = JSON.stringify({ nonce: crypto.randomBytes(16).toString('hex'), returnTo, client });
  (req.session as any).oauthState = state;
  const clientType = client === 'codespaces' ? 'codespaces' : 'platform';
  const url = githubOAuth.buildAuthorizeUrl(state, clientType as any);
  return res.redirect(url);
});

// GET /auth/github/callback -> exchange code for token and create/update local user
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code or state');

    const sessionState = (req.session as any).oauthState;
    if (!sessionState) return res.status(400).send('No session state');

    // Validate state (we stored JSON string)
    try {
      const parsed = typeof state === 'string' ? JSON.parse(state) : state;
      const sessParsed = typeof sessionState === 'string' ? JSON.parse(sessionState) : sessionState;
      if (!sessParsed || parsed?.nonce !== sessParsed?.nonce) {
        console.warn('OAuth state nonce mismatch');
      }
    } catch (e) {
      console.warn('Unable to parse state JSON');
    }

    // Determine which client (platform or codespaces) initiated the auth
    const parsedState = (() => { try { return JSON.parse(String(state)); } catch { return null; } })();
    const clientType = parsedState?.client === 'codespaces' ? 'codespaces' : 'platform';

    const accessToken = await githubOAuth.exchangeCodeForToken(String(code), clientType as any);

    // Get GitHub user
    const ghUser: any = await githubOAuth.getUserFromToken(accessToken);
    if (!ghUser || !ghUser.id) throw new Error('Invalid GitHub user response');

    // Upsert user and store token (do NOT log token)
    const tokenScopes = (await githubOAuth.getTokenScopes(accessToken)).scopes;

    let user = await prisma.user.findUnique({ where: { githubId: String(ghUser.id) } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId: String(ghUser.id),
          username: ghUser.login || ghUser.username || null,
          email: ghUser.email || null,
          avatarUrl: ghUser.avatar_url || null,
          githubAccessToken: accessToken,
          githubTokenScopes: tokenScopes,
          githubAccessTokenUpdatedAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: ghUser.login || user.username,
          email: ghUser.email || user.email,
          avatarUrl: ghUser.avatar_url || user.avatarUrl,
          githubAccessToken: accessToken,
          githubTokenScopes: tokenScopes,
          githubAccessTokenUpdatedAt: new Date(),
        },
      });
    }

    // Establish server session (store in session and also initialize passport session)
    (req.session as any).userId = user.id;
    if (typeof (req as any).login === 'function') {
      // populate passport session so req.isAuthenticated() works
      (req as any).login(user, (err: any) => {
        if (err) console.error('Passport login error:', err);
      });
    }

    // Redirect back to original page if present
    const sessParsed = (() => { try { return JSON.parse(sessionState); } catch { return null; } })();
    const returnTo = sessParsed?.returnTo || process.env.FRONTEND_URL + '/dashboard' || '/';
    return res.redirect(returnTo);
  } catch (err: any) {
    console.error('OAuth callback error', err && (err.message || err));
    return res.status(500).json({ message: err.message || 'OAuth callback failed' });
  }
});

// Get current user
router.get('/user', async (req, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) return res.json(req.user);
    const uid = (req.session as any)?.userId;
    if (!uid) return res.status(401).json({ message: 'Not authenticated' });
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    // Do NOT return access token
    const { githubAccessToken, githubTokenScopes, githubAccessTokenUpdatedAt, ...publicUser } = (user as any);
    return res.json(publicUser);
  } catch (err: any) {
    console.error('GET /auth/user error', err);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    // call passport logout if available (safe with callback)
    const doLogout = () => {
      try {
        if (typeof (req as any).logout === 'function') {
          (req as any).logout((err: any) => {
            if (err) console.error('Logout callback error:', err);
            // destroy session after logout
            req.session?.destroy((destroyErr) => {
              if (destroyErr) return res.status(500).json({ message: 'Logout failed' });
              res.json({ message: 'Logged out successfully' });
            });
          });
        } else {
          // destroy session if no passport logout
          req.session?.destroy((destroyErr) => {
            if (destroyErr) return res.status(500).json({ message: 'Logout failed' });
            res.json({ message: 'Logged out successfully' });
          });
        }
      } catch (e: any) {
        console.error('Logout error', e);
        res.status(500).json({ message: 'Logout failed' });
      }
    };

    doLogout();
  } catch (err: any) {
    console.error('Logout failed', err);
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default router;