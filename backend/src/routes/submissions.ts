import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Get user's submissions for a course (all assignments)
router.get('/course/:courseId', isAuthenticated, async (req: any, res) => {
  try {
    // DEV logging: show who is calling and for which course
    console.debug('GET /api/submissions/course/:courseId', { userId: req.user?.id, sessionUid: (req.session as any)?.userId, courseId: req.params.courseId, debugAll: req.query.debugAll });

    // DEV-only: if debugAll=1 and not in production, return all submissions for course (no user filter)
    if (process.env.NODE_ENV !== 'production' && req.query.debugAll) {
      const allSubs = await prisma.submission.findMany({
        where: { assignment: { week: { courseId: req.params.courseId } } },
        include: { assignment: { include: { week: true } } },
        orderBy: { submittedAt: 'desc' }
      });
      return res.json({ debugAll: true, total: allSubs.length, submissions: allSubs });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: req.user.id,
        assignment: {
          week: {
            courseId: req.params.courseId
          }
        }
      },
      include: {
        assignment: { include: { week: true } }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.debug('-> found submissions count', submissions.length);
    res.json(submissions);
  } catch (error) {
    console.error('Error in GET /api/submissions/course/:courseId', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

// Get user's submission for a specific assignment
router.get('/assignment/:assignmentId', isAuthenticated, async (req: any, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: {
        userId_assignmentId: {
          userId: req.user.id,
          assignmentId: req.params.assignmentId
        }
      },
      include: {
        assignment: { include: { week: true } }
      }
    });
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission' });
  }
});

// Submit or update assignment
router.post('/', isAuthenticated, async (req: any, res) => {
  try {
    const { assignmentId, content } = req.body;
    
    // Verify assignment exists and belongs to a course
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { week: { include: { course: true } } }
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user.id,
          courseId: assignment.week.courseId
        }
      }
    });
    
    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
    
    // Upsert submission by assignment
    const submission = await prisma.submission.upsert({
      where: {
        userId_assignmentId: {
          userId: req.user.id,
          assignmentId
        }
      },
      update: {
        content,
        submittedAt: new Date(),
        weekId: assignment.weekId
      },
      create: {
        userId: req.user.id,
        assignmentId,
        weekId: assignment.weekId,
        content
      },
      include: {
        assignment: { include: { week: true } }
      }
    });
    
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting assignment' });
  }
});

// Delete submission by assignment
router.delete('/:assignmentId', isAuthenticated, async (req: any, res) => {
  try {
    await prisma.submission.delete({
      where: {
        userId_assignmentId: {
          userId: req.user.id,
          assignmentId: req.params.assignmentId
        }
      }
    });
    
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting submission' });
  }
});

export default router;