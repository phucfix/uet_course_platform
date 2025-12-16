"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
};
// Get user's submissions for a course
router.get('/course/:courseId', isAuthenticated, async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            where: {
                userId: req.user.id,
                week: {
                    courseId: req.params.courseId
                }
            },
            include: {
                week: true
            },
            orderBy: {
                submittedAt: 'desc'
            }
        });
        res.json(submissions);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching submissions' });
    }
});
// Get user's submission for a specific week
router.get('/week/:weekId', isAuthenticated, async (req, res) => {
    try {
        const submission = await prisma.submission.findUnique({
            where: {
                userId_weekId: {
                    userId: req.user.id,
                    weekId: req.params.weekId
                }
            },
            include: {
                week: true
            }
        });
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        res.json(submission);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching submission' });
    }
});
// Submit or update assignment for a week
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { weekId, content } = req.body;
        // Verify user is enrolled in the course
        const week = await prisma.week.findUnique({
            where: { id: weekId },
            include: { course: true }
        });
        if (!week) {
            return res.status(404).json({ message: 'Week not found' });
        }
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: req.user.id,
                    courseId: week.courseId
                }
            }
        });
        if (!enrollment) {
            return res.status(403).json({ message: 'Not enrolled in this course' });
        }
        // Upsert submission
        const submission = await prisma.submission.upsert({
            where: {
                userId_weekId: {
                    userId: req.user.id,
                    weekId
                }
            },
            update: {
                content,
                submittedAt: new Date()
            },
            create: {
                userId: req.user.id,
                weekId,
                content
            },
            include: {
                week: true
            }
        });
        res.json(submission);
    }
    catch (error) {
        res.status(500).json({ message: 'Error submitting assignment' });
    }
});
// Delete submission
router.delete('/:weekId', isAuthenticated, async (req, res) => {
    try {
        await prisma.submission.delete({
            where: {
                userId_weekId: {
                    userId: req.user.id,
                    weekId: req.params.weekId
                }
            }
        });
        res.json({ message: 'Submission deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting submission' });
    }
});
exports.default = router;
