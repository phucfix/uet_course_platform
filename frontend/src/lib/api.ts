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
  unenrollFromCourse: (courseId: string) => 
    api.delete(`/api/enrollments/${courseId}`),
};

export const submissionApi = {
  getCourseSubmissions: (courseId: string) => 
    api.get(`/api/submissions/course/${courseId}`),
  getWeekSubmission: (weekId: string) => 
    api.get(`/api/submissions/week/${weekId}`),
  submitAssignment: (weekId: string, content: string) => 
    api.post('/api/submissions', { weekId, content }),
  deleteSubmission: (weekId: string) => 
    api.delete(`/api/submissions/${weekId}`),
};

export default api;