"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("./config/passport"));
const auth_1 = __importDefault(require("./routes/auth"));
const courses_1 = __importDefault(require("./routes/courses"));
const enrollments_1 = __importDefault(require("./routes/enrollments"));
const submissions_1 = __importDefault(require("./routes/submissions"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Routes
app.use('/auth', auth_1.default);
app.use('/api/courses', courses_1.default);
app.use('/api/enrollments', enrollments_1.default);
app.use('/api/submissions', submissions_1.default);
app.get('/', (req, res) => {
    res.json({ message: 'Course Platform API' });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
