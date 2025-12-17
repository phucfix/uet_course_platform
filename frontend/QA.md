# QA checklist — Grade + Completion Badge

Manual steps

1. Start backend (http://localhost:3000) and frontend (Vite dev server).
2. Make sure you have a student user with username `student-test` (or use your own test account).
3. On the **content site** (Hugo) open a problem page (e.g. `/courses/cs50/week0/problems/mario/`) and click **Enroll to Submit** in the "Submitting this problem" section near the bottom of the page. This will start GitHub OAuth and redirect back to the course page on the frontend with `?enrollCourseSlug=cs50&enrollWeek=<weekNumber>&openSubmit=1&problem=<problemSlug>`.
4. After OAuth completes you should land on the frontend course page, the corresponding week will be automatically opened and the submission form will be prefilled with a short note referencing the problem; you can edit and submit as usual; you'll be enrolled automatically.
5. Create a WorkspaceRun for the student with `assignmentId` set to a week id and a score >= 70 (or submit assignments via the UI).
6. Open the frontend, go to **My Courses** (usually `/my-courses`) or the course page, and find the relevant course and week.
7. Verify the week row shows:
   - A check mark (if there's a submission) or dash otherwise.
   - A grade pill with `score/max` and a `✅ Complete` badge when passing.
   - Hovering/tapping the pill shows the grade summary (if present).

Edge cases to verify

- Clicking Enroll when already enrolled → backend returns 400 "Already enrolled" and frontend shows a failure message.
- If OAuth didn't complete (no session), the Course page will render but enroll request will fail (you'll see "Enrollment failed").

Edge cases to verify

- No grade exists → shows `–` in the grade area.
- Grades below threshold (e.g., 50%) → shows `⚠️ Incomplete` badge.
- API unauthorized → frontend should not show grades (empty or dash).

Notes for automated tests

- I added a basic test sketch in `src/components/__tests__/GradeBadge.test.tsx` that relies on React Testing Library + Jest. Install `@testing-library/react` + `@testing-library/jest-dom` + `jest` if you want to run it.
- If you'd like, I can add test setup and CI in a follow-up (adds deps and config).