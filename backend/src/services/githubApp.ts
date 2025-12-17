import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const GITHUB_API_BASE = 'https://api.github.com';

function readPrivateKey(): string {
  const envKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (envKey && envKey.length > 0) return envKey.replace(/\\r\\n/g, '\n');

  const p = process.env.GITHUB_APP_PRIVATE_KEY_PATH || './secrets/github_app_private_key.pem';
  const resolved = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  if (!fs.existsSync(resolved)) throw new Error(`GitHub App private key file not found: ${resolved}`);
  return fs.readFileSync(resolved, 'utf8');
}

export function createAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) throw new Error('GITHUB_APP_ID not configured');
  const privateKey = readPrivateKey();

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + (9 * 60), // valid for 9 minutes
    iss: Number(appId),
  } as any;

  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  return token;
}

export async function getRepoInstallationId(owner: string, repo: string): Promise<number> {
  const jwtToken = createAppJwt();
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/installation`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to get installation for ${owner}/${repo}: ${res.status} ${body}`);
  }
  const data: any = await res.json();
  return data.id as number;
}

export async function createInstallationToken(installationId: number): Promise<string> {
  const jwtToken = createAppJwt();
  const url = `${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Failed to create installation token: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.token as string;
}

export async function getInstallationTokenForRepo(owner: string, repo: string): Promise<string> {
  // If user provided an explicit installation id, try using it first
  const explicitId = process.env.GITHUB_APP_INSTALLATION_ID;
  if (explicitId) {
    try {
      return await createInstallationToken(Number(explicitId));
    } catch (e) {
      console.warn('Explicit installation id failed, falling back to repo lookup', e);
    }
  }

  const installationId = await getRepoInstallationId(owner, repo);
  return await createInstallationToken(installationId);
}

export default {
  createAppJwt,
  getRepoInstallationId,
  createInstallationToken,
  getInstallationTokenForRepo,
};
