import { api } from './api';

/**
 * Analytics API service.
 */
export const analyticsApi = {
  async getDashboard() {
    try {
      return await api.get('/analytics/dashboard');
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('API connection failed (dev mode). Serving mock dashboard stats.');
        return {
          success: true,
          data: {
            revenue_today: 4500000,
            patients_today: 42,
            occupancy_rate: 85,
            online_staff: 12
          }
        };
      }
      throw e;
    }
  },
};

/**
 * Queue API service.
 */
export const queueApi = {
  getByDoctor(doctorId) {
    return api.get(`/queue/${doctorId}`);
  },

  addToQueue(data) {
    return api.post('/queue/add', data);
  },

  callNext(doctorId) {
    return api.post('/queue/next', { doctorId });
  },

  complete(id) {
    return api.post(`/queue/${id}/complete`);
  },
};

/**
 * Room API service.
 */
export const roomApi = {
  getAll() {
    return api.get('/rooms');
  },

  getDetails(id) {
    return api.get(`/rooms/${id}`);
  },

  assignPatient(data) {
    return api.post('/rooms/assign', data);
  },

  discharge(assignmentId) {
    return api.post(`/rooms/discharge/${assignmentId}`);
  },
};
