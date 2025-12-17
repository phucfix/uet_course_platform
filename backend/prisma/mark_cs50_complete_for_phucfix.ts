import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const username = 'phucfix';
  const courseSlug = 'cs50';
  const note = 'Marked complete by admin';

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exitCode = 2;
    return;
  }

  const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    console.error(`Course not found: ${courseSlug}`);
    process.exitCode = 3;
    return;
  }

  // Ensure enrollment exists
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    create: { userId: user.id, courseId: course.id },
    update: {}
  });

  // Fetch all assignments for course (exclude index pages)
  const assignments = await prisma.assignment.findMany({
    where: { week: { courseId: course.id }, NOT: { slug: { endsWith: '-_index' } } },
    include: { week: true }
  });

  if (assignments.length === 0) {
    console.log('No assignments found to mark.');
    return;
  }

  let created = 0;
  let updated = 0;

  for (const a of assignments) {
    const existing = await prisma.submission.findUnique({ where: { userId_assignmentId: { userId: user.id, assignmentId: a.id } } });
    if (existing) {
      await prisma.submission.update({ where: { id: existing.id }, data: { content: note, submittedAt: new Date(), weekId: a.weekId } });
      console.log(`Updated submission for assignment ${a.slug}`);
      updated += 1;
    } else {
      await prisma.submission.create({ data: { userId: user.id, assignmentId: a.id, weekId: a.weekId, content: note, submittedAt: new Date() } });
      console.log(`Created submission for assignment ${a.slug}`);
      created += 1;
    }
  }

  console.log(`Done. Created: ${created}, Updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error('Error marking assignments complete', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
