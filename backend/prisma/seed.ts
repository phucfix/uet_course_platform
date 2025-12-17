import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function parseFrontmatter(fileContents: string) {
  const fmMatch = fileContents.match(/---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const body = fmMatch[1];
  const res: Record<string, string> = {};
  for (const line of body.split(/\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+):\s*(?:"([^"]+)"|'([^']+)'|(.*))$/);
    if (m) {
      res[m[1]] = m[2] ?? m[3] ?? (m[4] ?? '').trim();
    }
  }
  return res;
}

async function seedFromContent() {
  // Try possible locations for the uet_course_content folder (workspace root or course-platform root)
  const candidates = [
    path.resolve(__dirname, '../../../uet_course_content/content/courses'),
    path.resolve(__dirname, '../../uet_course_content/content/courses'),
  ];
  let contentDir: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      contentDir = c;
      break;
    }
  }
  if (!contentDir) {
    console.warn('uet_course_content not found at any expected location:', candidates);
    return;
  }

  const entries = fs.readdirSync(contentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const slug = entry.name;
    const idxPath = path.join(contentDir, slug, '_index.md');
    let title = slug;
    let description = '';
    if (fs.existsSync(idxPath)) {
      const contents = fs.readFileSync(idxPath, 'utf8');
      const fm = parseFrontmatter(contents);
      if (fm.title) title = fm.title;
      if (fm.description) description = fm.description;
    }

    const course = await prisma.course.upsert({
      where: { slug },
      update: { title, description },
      create: { slug, title, description },
    });

    // find week directories like week0, week1, ...
    const subEntries = fs.readdirSync(path.join(contentDir, slug), { withFileTypes: true });
    const weeks: Array<{ weekNumber: number; title?: string; description?: string }> = [];
    for (const sub of subEntries) {
      if (!sub.isDirectory()) continue;
      const m = sub.name.match(/^week(\d+)$/);
      if (!m) continue;
      const weekNumber = Number(m[1]);
      const wIdx = path.join(contentDir, slug, sub.name, 'index.md');
      const wIdxAlt = path.join(contentDir, slug, sub.name, '_index.md');
      let wTitle = `Week ${weekNumber}`;
      let wDesc = '';
      if (fs.existsSync(wIdxAlt)) {
        const c = fs.readFileSync(wIdxAlt, 'utf8');
        const fm = parseFrontmatter(c);
        if (fm.title) wTitle = fm.title;
        if (fm.description) wDesc = fm.description;
      } else if (fs.existsSync(wIdx)) {
        const c = fs.readFileSync(wIdx, 'utf8');
        const fm = parseFrontmatter(c);
        if (fm.title) wTitle = fm.title;
        if (fm.description) wDesc = fm.description;
      }
      weeks.push({ weekNumber, title: wTitle, description: wDesc });
    }

    // Upsert weeks
    for (const w of weeks) {
      const wt = w.title ?? `Week ${w.weekNumber}`;
      const wd = w.description ?? '';
      const weekRecord = await prisma.week.upsert({
        where: {
          courseId_weekNumber: {
            courseId: course.id,
            weekNumber: w.weekNumber,
          },
        },
        update: { title: wt, description: wd },
        create: { courseId: course.id, weekNumber: w.weekNumber, title: wt, description: wd },
      });

      // seed assignments from content/courses/<slug>/weekN/problems/*.md
      const problemsDir = path.join(path.dirname(contentDir), '..', 'content', 'courses', slug, `week${w.weekNumber}`, 'problems');
      // attempt alternative path relative to contentDir
      const problemsDirAlt = path.join(contentDir, slug, `week${w.weekNumber}`, 'problems');
      const pd = fs.existsSync(problemsDirAlt) ? problemsDirAlt : problemsDir;
      if (fs.existsSync(pd)) {
        const problemFiles = fs.readdirSync(pd).filter((f) => f.endsWith('.md'));
        for (const pf of problemFiles) {
          const full = path.join(pd, pf);
          const contents = fs.readFileSync(full, 'utf8');
          const fm = parseFrontmatter(contents);
          const atitle = fm.title || pf.replace(/\.md$/, '').replace(/[_-]/g, ' ');
          const adhocSlug = `${slug}-week${w.weekNumber}-${pf.replace(/\.md$/, '')}`;
          const adesc = fm.description || '';
          await prisma.assignment.upsert({
            where: { slug: adhocSlug },
            update: { title: atitle, description: adesc, weekId: weekRecord.id },
            create: { slug: adhocSlug, title: atitle, description: adesc, weekId: weekRecord.id },
          });
        }
      }
    }
  }
}

async function main() {
  await seedFromContent();

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });