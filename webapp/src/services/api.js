import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// User endpoints
export const usersAPI = {
  listUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  getUser: (userId) => api.get(`/users/${userId}`),
  updateUser: (userId, data) => api.patch(`/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

// Workshop endpoints
export const workshopsAPI = {
  listWorkshops: (params) => api.get('/workshops', { params }),
  createWorkshop: (data) => api.post('/workshops', data),
  getWorkshop: (workshopId) => api.get(`/workshops/${workshopId}`),
  updateWorkshop: (workshopId, data) => api.patch(`/workshops/${workshopId}`, data),
  deleteWorkshop: (workshopId) => api.delete(`/workshops/${workshopId}`),
};

// Assignment endpoints
export const assignmentsAPI = {
  listAssignments: (workshopId) => api.get(`/workshops/${workshopId}/assignments`),
  createAssignment: (workshopId, data) => api.post(`/workshops/${workshopId}/assignments`, data),
  getAssignment: (workshopId, assignmentId) => api.get(`/workshops/${workshopId}/assignments/${assignmentId}`),
  updateAssignment: (workshopId, assignmentId, data) => api.patch(`/workshops/${workshopId}/assignments/${assignmentId}`, data),
  deleteAssignment: (workshopId, assignmentId) => api.delete(`/workshops/${workshopId}/assignments/${assignmentId}`),
};

// Enrollment endpoints
export const enrollmentsAPI = {
  listEnrollments: (params) => api.get('/enrollments', { params }),
  createEnrollment: (data) => api.post('/enrollments', data),
  getEnrollment: (enrollmentId) => api.get(`/enrollments/${enrollmentId}`),
  updateEnrollment: (enrollmentId, data) => api.patch(`/enrollments/${enrollmentId}`, data),
  deleteEnrollment: (enrollmentId) => api.delete(`/enrollments/${enrollmentId}`),
  generateEnrollmentLink: (workshopId, data) => api.post(`/workshops/${workshopId}/enrollment-link`, data),
  enrollWithToken: (data) => api.post('/enrollments/enroll', data),
};

// Submission endpoints
export const submissionsAPI = {
  listSubmissions: (params) => api.get('/submissions', { params }),
  createSubmission: (data) => api.post('/submissions', data),
  getSubmission: (submissionId) => api.get(`/submissions/${submissionId}`),
  getParticipantSubmissions: (participantId, params) => api.get(`/participants/${participantId}/submissions`, { params }),
};

// Certificate endpoints
export const certificatesAPI = {
  listCertificates: (params) => api.get('/certificates', { params }),
  generateCertificate: (data) => api.post('/certificates', data),
  getCertificate: (certificateId) => api.get(`/certificates/${certificateId}`),
  verifyCertificate: (uuid) => api.get(`/certificates/verify/${uuid}`),
  getParticipantCertificates: (participantId) => api.get(`/participants/${participantId}/certificates`),
};

// Instructor endpoints
export const instructorsAPI = {
  listWorkshopInstructors: (workshopId) => api.get(`/workshops/${workshopId}/instructors`),
  addWorkshopInstructor: (workshopId, data) => api.post(`/workshops/${workshopId}/instructors`, data),
  removeWorkshopInstructor: (workshopId, instructorId) => api.delete(`/workshops/${workshopId}/instructors/${instructorId}`),
};

// Storage endpoints
export const storageAPI = {
  generateUploadUrl: (data) => api.post('/storage/upload-url', data),
  generateDownloadUrl: (data) => api.post('/storage/download-url', data),
};

// Load endpoints (workshop loading - users, env, home zip)
export const loadAPI = {
  loadWorkshop: (workshopId) => api.post(`/load/${workshopId}`),
};

export default api;

