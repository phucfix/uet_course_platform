import 'dotenv/config';
import githubApp from '../src/services/githubApp';

(async function(){
  const owner = process.argv[2] || 'uet36';
  const repo = process.argv[3] || 'code18';
  const ref = process.argv[4] || 'main';
  try {
    const token = await githubApp.getInstallationTokenForRepo(owner, repo);
    console.log('Obtained installation token (masked):', token.slice(0,8) + '...');

    // Also fetch installation details using app JWT to inspect installation scopes/repos
    try {
      const jwt = githubApp.createAppJwt();
      const instId = process.env.GITHUB_APP_INSTALLATION_ID || '';
      if (instId) {
        const insUrl = `https://api.github.com/app/installations/${instId}`;
        const insRes = await fetch(insUrl, { headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json' } });
        const insText = await insRes.text();
        console.log('\n== installation info ==');
        console.log('HTTP', insRes.status);
        try { console.log(JSON.stringify(JSON.parse(insText), null, 2)); } catch { console.log(insText); }

        const listUrl = `https://api.github.com/app/installations/${instId}/repositories`;
        const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json' } });
        const listText = await listRes.text();
        console.log('\n== installation repositories ==');
        console.log('HTTP', listRes.status);
        try { console.log(JSON.stringify(JSON.parse(listText), null, 2)); } catch { console.log(listText); }
      } else {
        console.log('\nNo explicit GITHUB_APP_INSTALLATION_ID set; skipping installation-info fetch.');
      }
    } catch (e) {
      console.warn('Failed to fetch installation details via app JWT', e && (((e as any).message)||e));
    }

    // Debug: check default-attributes
    const defUrl = `https://api.github.com/repos/${owner}/${repo}/codespaces/default-attributes`;
    const defRes = await fetch(defUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    const defText = await defRes.text();
    console.log('\n== default-attributes ==');
    console.log('HTTP', defRes.status);
    try { console.log(JSON.stringify(JSON.parse(defText), null, 2)); } catch { console.log(defText); }

    // Debug: get repo metadata
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoRes = await fetch(repoUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    const repoText = await repoRes.text();
    console.log('\n== repo metadata ==');
    console.log('HTTP', repoRes.status);
    try { console.log(JSON.stringify(JSON.parse(repoText), null, 2)); } catch { console.log(repoText); }

    // Attempt to create codespace
    const url = `https://api.github.com/repos/${owner}/${repo}/codespaces`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    });

    const text = await res.text();
    console.log('\n== create response ==');
    console.log('HTTP', res.status);
    try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text); }
  } catch (err: any) {
    console.error('Error creating codespace:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
