import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Searching for weeks with weekNumber = 0...');
  const weeks0 = await prisma.week.findMany({ where: { weekNumber: 0 }, include: { assignments: true } });
  if (weeks0.length === 0) {
    console.log('✅ No week-0 records found. Nothing to clean up.');
    return;
  }

  for (const w of weeks0) {
    console.log(`Found week 0: id=${w.id} courseId=${w.courseId} assignments=${w.assignments.length}`);

    // Select auto-generated assignments safely: slug ending with '-auto' or title starting with 'Auto grading'
    const targets = w.assignments.filter((a) => (a.slug && a.slug.endsWith('-auto')) || (a.title && a.title.startsWith('Auto grading')));

    if (targets.length === 0) {
      console.log(`  No auto-generated assignments found for week ${w.id}. Skipping.`);
      continue;
    }

    for (const a of targets) {
      console.log(`  Removing assignment: id=${a.id} slug=${a.slug} title=${a.title}`);

      const wr = await prisma.workspaceRun.deleteMany({ where: { assignmentId: a.id } });
      const subs = await prisma.submission.deleteMany({ where: { assignmentId: a.id } });

      console.log(`    Deleted workspaceRuns=${wr.count}, submissions=${subs.count}`);

      await prisma.assignment.delete({ where: { id: a.id } });
      console.log('    Assignment deleted.');
    }
  }

  console.log('✅ Cleanup completed.');
}

main()
  .catch((e) => {
    console.error('Error cleaning up week 0 auto-generated assignments', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
