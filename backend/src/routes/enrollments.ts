import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const isAuthenticated = (req: any, res: any, next: any) => {
  try {
    if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
      return next();
    }
    // Support simple session-based auth (we set req.session.userId on OAuth callback)
    const uid = (req.session as any)?.userId;
    if (uid) {
      // attach minimal user object for downstream handlers
      req.user = req.user || { id: uid };
      return next();
    }
  } catch (e) {
    // fall through to unauthorized
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Get user's enrollments
router.get('/my-courses', isAuthenticated, async (req: any, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user.id },
      include: {
        course: {
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: { assignments: { orderBy: { createdAt: 'asc' } } }
            }
          }
        }
      }
    });

    // attach submissions per enrollment for progress calculation
    const results = [] as any[];
    for (const e of enrollments) {
      const subs = await prisma.submission.findMany({
        where: { userId: req.user.id, assignment: { week: { courseId: e.course.id } } }
      });
      results.push({ ...e, submissions: subs });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching enrollments' });
  }
});

// Enroll in a course
// Accepts either { courseId } or { courseSlug }
router.post('/', isAuthenticated, async (req: any, res) => {
  try {
    let { courseId, courseSlug, weekNumber } = req.body;

    // If slug provided, find or create a stub course record
    if (!courseId && courseSlug) {
      // normalize slug
      courseSlug = String(courseSlug).toLowerCase();
      let course = await prisma.course.findUnique({ where: { slug: courseSlug }, include: { weeks: true } });
      if (!course) {
        // create a minimal course record; title is slug with spaces
        const niceTitle = courseSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        course = await prisma.course.create({ data: { slug: courseSlug, title: niceTitle }, include: { weeks: true } });
      }

      // If weekNumber provided and week does not exist, create it
      if (weekNumber !== undefined && weekNumber !== null) {
        const wNum = Number(weekNumber);
        const cid = course!.id; // non-null assertion after create/find
        const existingWeek = await prisma.week.findFirst({ where: { courseId: cid, weekNumber: wNum } });
        if (!existingWeek) {
          await prisma.week.create({ data: { courseId: cid, weekNumber: wNum, title: `Week ${wNum}` } });
        }
      }

      // If course has no weeks, try to seed weeks from local course content folder (uet_course_content)
      try {
        const fs = await import('fs');
        const path = await import('path');
        const contentDir = path.join(__dirname, '../../../uet_course_content/content/courses', course!.slug);
        if (fs.existsSync(contentDir)) {
          const entries = fs.readdirSync(contentDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const idxPath = path.join(contentDir, entry.name, '_index.md');
              if (fs.existsSync(idxPath)) {
                const txt = fs.readFileSync(idxPath, 'utf8');
                // parse lightweight frontmatter for 'week' and 'title'
                const fmMatch = txt.match(/---([\s\S]*?)---/);
                if (fmMatch) {
                  const fm = fmMatch[1];
                  const weekMatch = fm.match(/week:\s*(\d+)/);
                  const titleMatch = fm.match(/title:\s*"?(.+?)"?\s*$/m);
                  if (weekMatch) {
                    const wNum = Number(weekMatch[1]);
                    const exists = await prisma.week.findFirst({ where: { courseId: course!.id, weekNumber: wNum } });
                    if (!exists) {
                      await prisma.week.create({ data: { courseId: course!.id, weekNumber: wNum, title: titleMatch ? titleMatch[1] : `Week ${wNum}` } });
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Week seeding error:', e);
      }

      courseId = course!.id;
    }

    if (!courseId) {
      return res.status(400).json({ message: 'courseId or courseSlug required' });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user.id,
          courseId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.user.id,
        courseId
      },
      include: {
        course: {
          include: {
            weeks: { orderBy: { weekNumber: 'asc' }, include: { assignments: { orderBy: { createdAt: 'asc' } } } }
          }
        }
      }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ message: 'Error enrolling in course' });
  }
});

// Unenroll from a course
router.delete('/:courseId', isAuthenticated, async (req: any, res) => {
  try {
    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId: req.user.id,
          courseId: req.params.courseId
        }
      }
    });
    
    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unenrolling from course' });
  }
});

export default router;