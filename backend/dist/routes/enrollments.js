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
// Get user's enrollments
router.get('/my-courses', isAuthenticated, async (req, res) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId: req.user.id },
            include: {
                course: {
                    include: {
                        weeks: {
                            orderBy: { weekNumber: 'asc' }
                        }
                    }
                }
            }
        });
        res.json(enrollments);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching enrollments' });
    }
});
// Enroll in a course
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { courseId } = req.body;
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
                course: true
            }
        });
        res.status(201).json(enrollment);
    }
    catch (error) {
        res.status(500).json({ message: 'Error enrolling in course' });
    }
});
// Unenroll from a course
router.delete('/:courseId', isAuthenticated, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: 'Error unenrolling from course' });
    }
});
exports.default = router;
