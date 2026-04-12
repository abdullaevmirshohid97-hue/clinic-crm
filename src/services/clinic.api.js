import { api } from './api';

/**
 * Analytics API service.
 */
export const analyticsApi = {
  getDashboard() {
    return api.get('/analytics/dashboard');
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
