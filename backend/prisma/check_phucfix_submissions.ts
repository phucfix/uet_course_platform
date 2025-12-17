import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

async function main() {
  const username = 'phucfix';
  const courseSlug = 'cs50';

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    console.log('User not found:', username);
    return;
  }

  const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    console.log('Course not found:', courseSlug);
    return;
  }

  // find assignments for the course
  const assignments = await prisma.assignment.findMany({ where: { week: { courseId: course.id } }, include: { week: true } });

  console.log(`Found ${assignments.length} assignments for course ${courseSlug}`);
  const mario = assignments.find(a => a.slug?.includes('mario') || a.title?.toLowerCase().includes('mario'));
  if (mario) {
    console.log('Mario assignment found:', { id: mario.id, slug: mario.slug, title: mario.title, weekId: mario.weekId, weekNumber: mario.week?.weekNumber });
  } else {
    console.log('Mario assignment not found among course assignments.');
  }

  // list user's submissions for this course
  const subs = await prisma.submission.findMany({ where: { userId: user.id, assignment: { week: { courseId: course.id } } }, include: { assignment: true } });
  console.log(`User ${username} has ${subs.length} submissions for course ${courseSlug}`);
  for (const s of subs) {
    console.log({ id: s.id, assignmentId: s.assignmentId, assignmentSlug: s.assignment?.slug, assignmentTitle: s.assignment?.title, submittedAt: s.submittedAt });
  }

  // check specifically for mario submission
  if (mario) {
    const subMario = subs.find(s => s.assignmentId === mario.id);
    if (subMario) {
      console.log('Mario is submitted by user:', { submissionId: subMario.id, submittedAt: subMario.submittedAt });
    } else {
      console.log('No submission by user found for Mario (assignment id:', mario.id, ')');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
