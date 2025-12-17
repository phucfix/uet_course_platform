import querystring from 'querystring';
import { getInstallationTokenForRepo } from './githubApp';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_BASE = 'https://api.github.com';

export function buildAuthorizeUrl(state: string, repo: string) {
  const params = {
    client_id: process.env.GITHUB_CODESPACES_CLIENT_ID || process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/github/callback`,
    // Ensure `codespace` scope is requested by default so the access token
    // can create codespaces. Allow override via `GITHUB_OAUTH_SCOPES`.
    scope: process.env.GITHUB_OAUTH_SCOPES || 'repo,read:org,codespace',
    state: JSON.stringify({ state, repo }),
    allow_signup: 'false',
  };

  return `${GITHUB_AUTHORIZE_URL}?${querystring.stringify(params)}`;
}

export async function exchangeCodeForToken(code: string) {
  const body = {
    client_id: process.env.GITHUB_CODESPACES_CLIENT_ID || process.env.GITHUB_CLIENT_ID!,
    client_secret: process.env.GITHUB_CODESPACES_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET!,
    code,
  };

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  const d: any = data;
  if (!res.ok || d.error) {
    throw new Error(d.error_description || d.error || 'Token exchange failed');
  }
  return d.access_token as string;
}

export async function createCodespaceForRepo(accessToken: string, owner: string, repo: string, ref?: string) {
  // Use the repository-scoped endpoint as the REST API requires either
  // POST /repos/{owner}/{repo}/codespaces (for creating a codespace in a repo)
  // or POST /user/codespaces (which requires repository_id instead of repository string).
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/codespaces`;
  const body: any = {};
  if (ref) body.ref = ref;

const res = await fetch(url, {
     method: 'POST',
     headers: {
       Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  const d: any = data;
  if (!res.ok) {
    console.error('Failed to create codespace', { status: res.status, body: d });
    throw new Error(JSON.stringify({ status: res.status, body: d }));
  }
  return d;
}

export async function listUserCodespaces(accessToken: string): Promise<any[]> {
  const url = `${GITHUB_API_BASE}/user/codespaces`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to list user codespaces: ${res.status} ${body}`);
  }
  const data: any = await res.json().catch(() => ({}));
  // API returns { total_count, codespaces: [...] }
  return data.codespaces || [];
}

export async function findUserCodespace(accessToken: string, owner: string, repo: string): Promise<any | null> {
  const list = await listUserCodespaces(accessToken);
  const full = `${owner}/${repo}`;
  for (const cs of list) {
    const repoFull = cs?.repository?.full_name || `${cs?.repository?.owner?.login}/${cs?.repository?.name}`;
    if (repoFull === full) return cs;
  }
  return null;
}

export async function waitForCodespaceReady(accessToken: string, codespaceName: string, timeout = 60000, interval = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetch(`${GITHUB_API_BASE}/user/codespaces/${encodeURIComponent(codespaceName)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.ok) {
      const d: any = await res.json().catch(() => ({}));
      const webUrl = d.html_url || d.web_url || d.url || d.access_url;
      if (webUrl) return d;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Timed out waiting for codespace to be ready');
}

export async function getAuthenticatedUser(accessToken: string) {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function repoExists(owner: string, repo: string, accessToken?: string) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  const headers: any = { Accept: 'application/vnd.github+json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers });
  return res.ok;
}

export async function getRepoDefaultAttributes(accessToken: string, owner: string, repo: string): Promise<{ok:boolean,status:number,body:any}> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/codespaces/default-attributes`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const data: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: data };
}

export async function getTokenScopes(accessToken: string) {
  const res = await fetch(`${GITHUB_API_BASE}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  const scopes = res.headers.get('x-oauth-scopes') || null;
  const acceptScopes = res.headers.get('x-accepted-oauth-scopes') || null;
  return { ok: res.ok, status: res.status, scopes, acceptScopes } as {ok:boolean,status:number,scopes:string|null,acceptScopes:string|null};
}

export async function getRepoDetails(owner: string, repo: string, accessToken?: string): Promise<{ok:boolean,status:number,body:any}> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  const headers: any = { Accept: 'application/vnd.github+json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers });
  const body: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export async function createCodespaceForUser(accessToken: string, repository_id: number, ref?: string): Promise<any> {
  const url = `${GITHUB_API_BASE}/user/codespaces`;
  const body: any = { repository_id };
  if (ref) body.ref = ref;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Failed to create codespace (user endpoint)', { status: res.status, body: data });
    throw new Error(JSON.stringify({ status: res.status, body: data }));
  }
  return data;
}

export async function createFork(owner: string, repo: string, accessToken: string) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/forks`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  const d: any = data;
  if (!res.ok) {
    throw new Error(d.message || 'Failed to create fork');
  }
  return d;
}

export async function waitForRepo(owner: string, repo: string, accessToken: string, timeout = 30000, interval = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await repoExists(owner, repo, accessToken)) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Timed out waiting for fork to be ready');
}
