import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const username = 'phucfix';
  const assignmentSlug = 'mario';
  const note = 'Auto-submitted (mario) by admin script';

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exitCode = 2;
    return;
  }

  let assignment = await prisma.assignment.findUnique({ where: { slug: assignmentSlug }, include: { week: true } });
  if (!assignment) {
    // try fuzzy match by slug part (e.g., cs50-week0-mario)
    assignment = await prisma.assignment.findFirst({ where: { slug: { contains: assignmentSlug } }, include: { week: true } });
  }

  if (!assignment) {
    console.error(`Assignment not found: ${assignmentSlug}`);
    process.exitCode = 3;
    return;
  }

  // Ensure enrollment exists for the course
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: assignment.week.courseId } },
    create: { userId: user.id, courseId: assignment.week.courseId },
    update: {}
  });

  // Upsert submission
  const sub = await prisma.submission.upsert({
    where: { userId_assignmentId: { userId: user.id, assignmentId: assignment.id } },
    update: { content: note, submittedAt: new Date(), weekId: assignment.weekId },
    create: { userId: user.id, assignmentId: assignment.id, weekId: assignment.weekId, content: note }
  });

  console.log('Submission created/updated:', { id: sub.id, user: user.username, assignment: assignment.slug, submittedAt: sub.submittedAt });
}

main()
  .catch((e) => {
    console.error('Error creating submission', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
