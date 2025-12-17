import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const execute = args.includes('--execute') || args.includes('--yes');

async function main() {
  console.log(`🔍 Looking for assignments titled "Week <N> Problems" (${execute ? 'EXECUTE' : 'DRY-RUN'})...`);

  // Find assignments whose title looks like "Week <number> Problems" by checking prefix and suffix
  const assignments = await prisma.assignment.findMany({
    where: {
      AND: [
        { title: { startsWith: 'Week ' } },
        { title: { endsWith: ' Problems' } }
      ]
    },
    include: { week: true }
  });

  if (assignments.length === 0) {
    console.log('No matching assignments found.');
    return;
  }

  let totalMatches = 0;
  for (const a of assignments) {
    const subsCount = await prisma.submission.count({ where: { assignmentId: a.id } });
    const wrCount = await prisma.workspaceRun.count({ where: { assignmentId: a.id } });
    console.log(`MATCH id=${a.id} slug=${a.slug} title=${a.title} courseId=${a.week?.courseId ?? 'unknown'} week=${a.week?.weekNumber ?? 'unknown'} subs=${subsCount} workspaceRuns=${wrCount}`);
    totalMatches += 1;

    if (execute) {
      // delete dependent records then assignment
      const wrRes = await prisma.workspaceRun.deleteMany({ where: { assignmentId: a.id } });
      const subRes = await prisma.submission.deleteMany({ where: { assignmentId: a.id } });
      await prisma.assignment.delete({ where: { id: a.id } });
      console.log(`  Deleted: workspaceRuns=${wrRes.count} submissions=${subRes.count} assignment deleted.`);
    }
  }

  console.log(`${execute ? '✅ Deleted' : 'ℹ️ Found'} ${totalMatches} assignment(s) titled "Week <N> Problems".`);
  if (!execute) console.log('Run with `--execute` to delete (or use npm script `prisma:cleanup-weekN-problems:exec`).');
}

main()
  .catch((e) => {
    console.error('Error checking/deleting Week N Problems assignments', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
