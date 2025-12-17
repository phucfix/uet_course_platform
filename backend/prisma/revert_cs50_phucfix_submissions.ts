import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const execute = args.includes('--execute') || args.includes('--yes');

async function main() {
  const username = 'phucfix';
  const courseSlug = 'cs50';

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    console.log(`User not found: ${username}`);
    return;
  }

  const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    console.log(`Course not found: ${courseSlug}`);
    return;
  }

  console.log(`🔍 Searching submissions for user='${username}' in course='${courseSlug}' (${execute ? 'EXECUTE' : 'DRY-RUN'})...`);

  const subs = await prisma.submission.findMany({
    where: {
      userId: user.id,
      assignment: { week: { courseId: course.id } }
    },
    include: { assignment: { include: { week: true } } },
    orderBy: { submittedAt: 'asc' }
  });

  if (subs.length === 0) {
    console.log('No submissions found.');
    return;
  }

  for (const s of subs) {
    console.log(`MATCH id=${s.id} assignment=${s.assignment.slug} week=${s.assignment.week?.weekNumber ?? 'unknown'} submittedAt=${s.submittedAt.toISOString()}`);
  }

  console.log(`${execute ? 'Deleting' : 'Would delete'} ${subs.length} submission(s).`);

  if (execute) {
    const ids = subs.map((s) => s.id);
    const res = await prisma.submission.deleteMany({ where: { id: { in: ids } } });
    console.log(`✅ Deleted ${res.count} submissions.`);
  } else {
    console.log('Run with `--execute` to delete (or use npm script `prisma:revert-cs50-phucfix:exec`).');
  }
}

main()
  .catch((e) => {
    console.error('Error during revert operation', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
