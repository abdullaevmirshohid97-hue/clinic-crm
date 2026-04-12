import { api } from './api';

/**
 * Patient API service.
 */
export const patientApi = {
  getAll(params = {}) {
    return api.get('/patients', params);
  },

  getById(id) {
    return api.get(`/patients/${id}`);
  },

  create(data) {
    return api.post('/patients', data);
  },

  update(id, data) {
    return api.put(`/patients/${id}`, data);
  },
};
