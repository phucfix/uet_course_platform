# Course Platform

A modern course management platform similar to CS50, built with React, Node.js, Express, PostgreSQL, and Prisma. Users can authenticate via GitHub, enroll in courses, and submit assignments.

## Features

- 🔐 GitHub OAuth Authentication
- 📚 Course enrollment system
- 📝 Weekly assignment submission
- 👤 User progress tracking
- 🎨 Clean, minimal UI inspired by CS50

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite
- TailwindCSS
- React Router
- TanStack Query (React Query)
- Axios

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Passport.js (GitHub OAuth)
- Express Session

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v18 or higher)
- Docker & Docker Compose
- Git

## Project Structure

```
course-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   │   └── passport.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── courses.ts
│   │   │   ├── enrollments.ts
│   │   │   └── submissions.ts
│   │   └── index.ts
│   ├── .env
│   ├── docker-compose.yml
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.tsx
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   ├── Login.tsx
    │   │   └── CourseDetail.tsx
    │   ├── lib/
    │   │   └── api.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    └── tailwind.config.js
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd course-platform
```

### 2. Backend Setup

#### 2.1. Install Dependencies

```bash
cd backend
npm install
```

#### 2.2. Setup PostgreSQL with Docker

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    restart: always
    environment:
      POSTGRES_USER: course_user
      POSTGRES_PASSWORD: course_password
      POSTGRES_DB: course_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start PostgreSQL:

```bash
docker-compose up -d
```

#### 2.3. Configure Environment Variables

Create `.env` file in `backend/` directory:

```env
DATABASE_URL="postgresql://course_user:course_password@localhost:5432/course_platform"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
SESSION_SECRET="your_random_secret_key_here"
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

#### 2.4. Setup GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** Course Platform
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:3000/auth/github/callback`
4. Click **"Register application"**
5. Copy **Client ID** and **Client Secret** to your `.env` file

#### 2.5. Run Database Migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### 2.6. Seed Database

```bash
npx prisma db seed
```

This will create 3 sample courses:
- CS50x: Introduction to Computer Science (10 weeks)
- Full Stack Web Development (6 weeks)
- Data Science with Python (5 weeks)

#### 2.7. Start Backend Server

```bash
npm run dev
```

Backend will run on `http://localhost:3000`

### 3. Frontend Setup

#### 3.1. Install Dependencies

```bash
cd ../frontend
npm install
```

#### 3.2. Start Frontend Development Server

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Usage

### 1. Login
- Navigate to `http://localhost:5173`
- Click **"Login"** button
- Authenticate with your GitHub account

### 2. View Courses
- After login, you'll see courses you're enrolled in
- Initially, the database is seeded with 3 courses

### 3. Enroll in a Course
- Use the backend API or Prisma Studio to enroll users in courses
- Or add enrollment functionality to the frontend

### 4. Submit Assignments
- Click on a course card
- Select a week from the list
- Write your submission in the text area
- Click **"Submit"**

## Development

### Backend Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Frontend Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Endpoints

### Authentication
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/user` - Get current user
- `POST /auth/logout` - Logout

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:slug` - Get course by slug
- `POST /api/courses` - Create new course (auth required)
- `POST /api/courses/:courseId/weeks` - Add week to course (auth required)

### Enrollments
- `GET /api/enrollments/my-courses` - Get user's enrolled courses (auth required)
- `POST /api/enrollments` - Enroll in a course (auth required)
- `DELETE /api/enrollments/:courseId` - Unenroll from course (auth required)

### Submissions
- `GET /api/submissions/course/:courseId` - Get user's submissions for a course (auth required)
- `GET /api/submissions/week/:weekId` - Get user's submission for a week (auth required)
- `POST /api/submissions` - Submit or update assignment (auth required)
- `DELETE /api/submissions/:weekId` - Delete submission (auth required)

## Database Schema

### User
- id, githubId, username, email, avatarUrl
- Relations: enrollments, submissions

### Course
- id, title, description, slug
- Relations: weeks, enrollments

### Week
- id, courseId, weekNumber, title, description
- Relations: course, submissions

### Enrollment
- id, userId, courseId, enrolledAt
- Relations: user, course

### Submission
- id, userId, weekId, content, submittedAt
- Relations: user, week

## Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose restart

# View logs
docker-compose logs postgres
```

### Prisma issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database and reseed
npx prisma migrate reset
```

### Frontend not connecting to backend
- Ensure backend is running on port 3000
- Check CORS configuration in `backend/src/index.ts`
- Verify `FRONTEND_URL` in `.env` is `http://localhost:5173`

### GitHub OAuth not working
- Verify callback URL in GitHub OAuth App settings
- Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
- Ensure backend URL is correct in `frontend/src/lib/api.ts`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License

## Contact

For questions or support, please open an issue on GitHub.
