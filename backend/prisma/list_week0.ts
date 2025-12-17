import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const weeks0 = await prisma.week.findMany({ where: { weekNumber: 0 }, include: { assignments: true } });
  if (weeks0.length === 0) {
    console.log('No week 0 records found');
    return;
  }

  for (const w of weeks0) {
    console.log(`Week id=${w.id} courseId=${w.courseId} assignments=${w.assignments.length}`);

    for (const a of w.assignments) {
      const subsCount = await prisma.submission.count({ where: { assignmentId: a.id } });
      const wrCount = await prisma.workspaceRun.count({ where: { assignmentId: a.id } });
      console.log(`  Assignment id=${a.id} slug=${a.slug} title=${a.title} subs=${subsCount} workspaceRuns=${wrCount}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Error listing week 0', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
