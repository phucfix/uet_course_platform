import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const username = 'phucfix';
  const assignmentSlug = 'cs50-week0-mario';
  const content = 'Marked complete by admin';

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exitCode = 2;
    return;
  }

  const assignment = await prisma.assignment.findUnique({ where: { slug: assignmentSlug } });
  if (!assignment) {
    console.error(`Assignment not found: ${assignmentSlug}`);
    process.exitCode = 3;
    return;
  }

  try {
    const res = await prisma.submission.upsert({
      where: { userId_assignmentId: { userId: user.id, assignmentId: assignment.id } },
      update: { content, submittedAt: new Date(), weekId: assignment.weekId },
      create: { userId: user.id, assignmentId: assignment.id, weekId: assignment.weekId, content, submittedAt: new Date() },
    });
    console.log('✅ Upserted submission:', { id: res.id, userId: res.userId, assignmentId: res.assignmentId, submittedAt: res.submittedAt });
  } catch (err) {
    console.error('Error upserting submission', err);
    process.exitCode = 4;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
