import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

export const authApi = {
  getCurrentUser: () => api.get('/auth/user'),
  logout: () => api.post('/auth/logout'),
  loginWithGithub: () => {
    window.location.href = 'http://localhost:3000/auth/github';
  }
};

export const courseApi = {
  getAllCourses: () => api.get('/api/courses'),
  getCourse: (slug: string) => api.get(`/api/courses/${slug}`),
  createCourse: (data: any) => api.post('/api/courses', data),
  addWeek: (courseId: string, data: any) => 
    api.post(`/api/courses/${courseId}/weeks`, data),
};

export const enrollmentApi = {
  getMyCourses: () => api.get('/api/enrollments/my-courses'),
  enrollInCourse: (courseId: string) => 
    api.post('/api/enrollments', { courseId }),
  enrollInCourseBySlug: (courseSlug: string, weekNumber?: number) =>
    api.post('/api/enrollments', { courseSlug, weekNumber }),
  unenrollFromCourse: (courseId: string) => 
    api.delete(`/api/enrollments/${courseId}`),
};

export const submissionApi = {
  getCourseSubmissions: (courseId: string) => 
    api.get(`/api/submissions/course/${courseId}`),
  getAssignmentSubmission: (assignmentId: string) => 
    api.get(`/api/submissions/assignment/${assignmentId}`),
  submitAssignment: (assignmentId: string, content: string) => 
    api.post('/api/submissions', { assignmentId, content }),
  deleteSubmission: (assignmentId: string) => 
    api.delete(`/api/submissions/${assignmentId}`),
};

export const gradesApi = {
  // GET /api/grades?username=...&assignmentId=...
  getGrades: (username: string, assignmentId?: string, limit = 1) =>
    api.get('/api/grades', { params: { username, assignmentId, limit } }),
};

export default api;