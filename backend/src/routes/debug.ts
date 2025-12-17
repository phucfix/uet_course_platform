import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Simple debug endpoint: list recent workspace runs
router.get('/workspace-runs', async (req, res) => {
  try {
    const rows = await prisma.workspaceRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(rows);
  } catch (err: any) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Lightweight debug UI for manual inspection of grades
router.get('/grades-ui', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><title>Grades UI</title></head>
    <body>
      <h1>Grades Debug UI</h1>
      <form id="f">
        Username: <input id="username" name="username" value="student-test" />
        AssignmentId: <input id="assignment" name="assignment" />
        <button type="submit">Fetch</button>
      </form>
      <pre id="out"></pre>
      <script>
        document.getElementById('f').addEventListener('submit', async (e) => {
          e.preventDefault();
          const u = document.getElementById('username').value;
          const a = document.getElementById('assignment').value;
          const q = new URLSearchParams();
          q.set('username', u);
          if (a) q.set('assignmentId', a);
          const res = await fetch('/api/grades?' + q.toString(), { headers: { 'Authorization': 'Bearer ' + (window.PLATFORM_TOKEN || '') } });
          const data = await res.json();
          document.getElementById('out').textContent = JSON.stringify(data, null, 2);
        });
      </script>
    </body>
    </html>
  `);
});

export default router;
