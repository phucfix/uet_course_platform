import querystring from 'querystring';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_BASE = 'https://api.github.com';

export function buildAuthorizeUrl(state: string, clientType?: 'platform' | 'codespaces') {
  const clientId = clientType === 'codespaces' ? (process.env.GITHUB_CODESPACES_CLIENT_ID || process.env.GITHUB_CLIENT_ID!) : process.env.GITHUB_CLIENT_ID!;
  const params = {
    client_id: clientId,
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/github/callback`,
    scope: process.env.GITHUB_OAUTH_SCOPES || 'repo,read:org,codespace',
    state,
    allow_signup: 'false',
  } as any;

  return `${GITHUB_AUTHORIZE_URL}?${querystring.stringify(params)}`;
}

export async function exchangeCodeForToken(code: string, clientType?: 'platform' | 'codespaces') {
  const clientId = clientType === 'codespaces' ? (process.env.GITHUB_CODESPACES_CLIENT_ID || process.env.GITHUB_CLIENT_ID!) : process.env.GITHUB_CLIENT_ID!;
  const clientSecret = clientType === 'codespaces' ? (process.env.GITHUB_CODESPACES_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET!) : process.env.GITHUB_CLIENT_SECRET!;

  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  } as any;

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

export async function getUserFromToken(accessToken: string) {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch GitHub user: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data;
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

export default {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  getUserFromToken,
  getTokenScopes,
};
