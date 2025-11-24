import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check authentication
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: { enrollments: true, weeks: true }
        }
      }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

// Get single course with weeks
router.get('/:slug', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course' });
  }
});

// Create a new course (admin only - simplified)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, description, slug } = req.body;
    const course = await prisma.course.create({
      data: { title, description, slug }
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error creating course' });
  }
});

// Add week to course
router.post('/:courseId/weeks', isAuthenticated, async (req, res) => {
  try {
    const { weekNumber, title, description } = req.body;
    const week = await prisma.week.create({
      data: {
        courseId: req.params.courseId,
        weekNumber,
        title,
        description
      }
    });
    res.status(201).json(week);
  } catch (error) {
    res.status(500).json({ message: 'Error creating week' });
  }
});

export default router;