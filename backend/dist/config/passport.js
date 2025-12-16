"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_github2_1 = require("passport-github2");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
passport_1.default.use(new passport_github2_1.Strategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Tìm hoặc tạo user
        let user = await prisma.user.findUnique({
            where: { githubId: profile.id },
        });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    githubId: profile.id,
                    username: profile.username,
                    email: profile.emails?.[0]?.value,
                    avatarUrl: profile.photos?.[0]?.value,
                },
            });
        }
        return done(null, user);
    }
    catch (error) {
        return done(error, null);
    }
}));
exports.default = passport_1.default;
