import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const execute = args.includes('--execute') || args.includes('--yes');

async function main() {
  console.log(`🔍 Looking for week 0 index assignments (${execute ? 'EXECUTE' : 'DRY-RUN'})...`);

  const weeks0 = await prisma.week.findMany({ where: { weekNumber: 0 }, include: { assignments: true } });
  if (weeks0.length === 0) {
    console.log('No week 0 records found');
    return;
  }

  let totalMatches = 0;

  for (const w of weeks0) {
    console.log(`Week id=${w.id} courseId=${w.courseId} assignments=${w.assignments.length}`);

    const targets = w.assignments.filter((a) => a.slug && a.slug.endsWith('-_index'));
    if (targets.length === 0) {
      console.log('  No index assignments in this week.');
      continue;
    }

    for (const a of targets) {
      const subsCount = await prisma.submission.count({ where: { assignmentId: a.id } });
      const wrCount = await prisma.workspaceRun.count({ where: { assignmentId: a.id } });
      console.log(`  MATCH id=${a.id} slug=${a.slug} title=${a.title} subs=${subsCount} workspaceRuns=${wrCount}`);

      totalMatches += 1;

      if (execute) {
        // delete workspace runs and submissions first
        const wrRes = await prisma.workspaceRun.deleteMany({ where: { assignmentId: a.id } });
        const subRes = await prisma.submission.deleteMany({ where: { assignmentId: a.id } });
        await prisma.assignment.delete({ where: { id: a.id } });
        console.log(`    Deleted: workspaceRuns=${wrRes.count} submissions=${subRes.count} assignment deleted.`);
      }
    }
  }

  if (totalMatches === 0) {
    console.log('No index assignments found for week 0 across courses.');
  } else {
    console.log(`${execute ? '✅ Deleted' : 'ℹ️ Found'} ${totalMatches} index assignment(s).`);
    if (!execute) console.log('Run with `--execute` to delete (or use npm script `prisma:cleanup-week0-index:exec`).');
  }
}

main()
  .catch((e) => {
    console.error('Error checking/deleting week 0 index assignments', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
