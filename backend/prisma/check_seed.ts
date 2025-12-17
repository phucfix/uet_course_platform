import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const courses = await prisma.course.findMany({ include: { weeks: { include: { assignments: true } } } });
  console.log(`Found ${courses.length} courses:`);
  for (const c of courses) {
    const assignments = c.weeks.reduce((acc: number, w: any) => acc + (w.assignments ? w.assignments.length : 0), 0);
    console.log(`- ${c.slug}: ${c.weeks.length} weeks, ${assignments} problems`);
  }
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });