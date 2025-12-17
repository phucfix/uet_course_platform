import { PrismaClient } from '@prisma/client';
import { computeScoreFromResult } from './webhookService';

const prisma = new PrismaClient();

/**
 * Try to mark a submission complete when score >= threshold (percentage of maxScore)
 * assignmentId is expected to be something like 'week1' or a week id.
 */
export async function markSubmissionIfPassed(githubLogin: string | null | undefined, assignmentId: string | null | undefined, score: number | null | undefined, maxScore = 100, thresholdPercent = 70) {
  if (!githubLogin || !assignmentId || score == null) return null;

  const percent = (score / maxScore) * 100;
  if (percent < thresholdPercent) return null;

  // Find user by github username
  const user = await prisma.user.findFirst({ where: { username: githubLogin } });
  if (!user) return null;

  // First, try to resolve assignmentId -> Assignment
  let assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });

  // If not found, try to resolve to a Week (backwards compatibility)
  if (!assignment) {
    let week = await prisma.week.findUnique({ where: { id: assignmentId } });
    if (!week) {
      const m = assignmentId.match(/^week(\d+)$/i);
      if (m) {
        const weekNumber = Number(m[1]);
        week = await prisma.week.findFirst({ where: { weekNumber } });
      }
    }

    if (!week) return null;

    // Ensure there is an assignment record for this week to attach the run/submission
    assignment = await prisma.assignment.upsert({
      where: { slug: `${week.id}-auto` },
      update: { weekId: week.id, title: `Auto grading ${week.title}` },
      create: { weekId: week.id, title: `Auto grading ${week.title}`, slug: `${week.id}-auto` }
    });
  }

  const weekForCourse = await prisma.week.findUnique({ where: { id: assignment.weekId } });
  if (!weekForCourse) return null;

  // Ensure enrollment exists (auto-enroll if missing)
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: weekForCourse.courseId } },
    create: { userId: user.id, courseId: weekForCourse.courseId },
    update: {}
  });

  // Upsert submission for the assignment
  const content = `Auto-submitted by grading: ${score}/${maxScore} (${Math.round((score/maxScore)*100)}%).`; 
  const submission = await prisma.submission.upsert({
    where: { userId_assignmentId: { userId: user.id, assignmentId: assignment.id } },
    create: { userId: user.id, assignmentId: assignment.id, weekId: assignment.weekId, content },
    update: { content, submittedAt: new Date() }
  });

  return submission;
}

export default { markSubmissionIfPassed };
