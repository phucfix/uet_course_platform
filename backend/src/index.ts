import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import enrollmentRoutes from './routes/enrollments';
import submissionRoutes from './routes/submissions';
import codespacesRoutes from './routes/codespaces';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Support multiple frontend origins (comma-separated in FRONTEND_URLS) so the dashboard and course site
// can both interact with the backend (e.g., dashboard at 5173 and course content at 1313).
const _allowed = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (no origin) and any allowed origins
      if (!origin) return callback(null, true);
      if (_allowed.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('CORS: Origin not allowed'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/codespaces', codespacesRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Course Platform API' });
});

// Health check for debugging
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});