"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const router = express_1.default.Router();
// Redirect to GitHub for authentication
router.get('/github', passport_1.default.authenticate('github', { scope: ['user:email'] }));
// GitHub callback
router.get('/github/callback', passport_1.default.authenticate('github', { failureRedirect: process.env.FRONTEND_URL }), (req, res) => {
    // Successful authentication, redirect to frontend
    res.redirect(process.env.FRONTEND_URL + '/dashboard');
});
// Get current user
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    }
    else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});
// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});
exports.default = router;
