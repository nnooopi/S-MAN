// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Student endpoints
    tasks: {
      submissionHistory: (taskId) => `${API_BASE_URL}/api/tasks/${taskId}/submission-history`,
      feedback: `${API_BASE_URL}/api/tasks/feedback`,
      submit: (taskId) => `${API_BASE_URL}/api/student/tasks/${taskId}/submit`,
    },
    student: {
      grades: {
        overview: `${API_BASE_URL}/api/student/grades/overview`,
        project: (projectId) => `${API_BASE_URL}/api/student/projects/${projectId}/grades`,
      },
      projects: {
        dashboard: (projectId) => `${API_BASE_URL}/api/student/projects/${projectId}/dashboard`,
        evaluations: (projectId) => `${API_BASE_URL}/api/student/projects/${projectId}/evaluations`,
      },
      courses: `${API_BASE_URL}/api/student/courses`,
      courseProjects: (courseId) => `${API_BASE_URL}/api/student/course/${courseId}/projects`,
      dashboardGroups: `${API_BASE_URL}/api/student/dashboard/groups`,
      myTasks: (projectId) => `${API_BASE_URL}/api/student/my-tasks?projectId=${projectId}`,
      submitFeedback: `${API_BASE_URL}/api/student/submit-feedback`,
    },
    studentLeader: {
      projects: `${API_BASE_URL}/api/student-leader/projects`,
      projectMembers: (projectId) => `${API_BASE_URL}/api/student-leader/projects/${projectId}/members`,
      memberSubmissions: (projectId, memberId) => `${API_BASE_URL}/api/member-submissions/${projectId}/${memberId}`,
      submissions: {
        askRevise: (submissionId) => `${API_BASE_URL}/api/student-leader/submissions/${submissionId}/ask-revise`,
        markComplete: (submissionId) => `${API_BASE_URL}/api/student-leader/submissions/${submissionId}/mark-complete`,
        approve: (submissionId) => `${API_BASE_URL}/api/student-leader/submissions/${submissionId}/approve`,
        requestRevision: (submissionId) => `${API_BASE_URL}/api/student-leader/submissions/${submissionId}/request-revision`,
      }
    }
  }
};

// Helper function to make API calls
export const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const defaultOptions = {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  // Only add Content-Type if not using FormData
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return fetch(url, mergedOptions);
};