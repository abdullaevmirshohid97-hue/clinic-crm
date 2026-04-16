import { api } from './api';

/**
 * Patient API service.
 */
export const patientApi = {
  getAll(params: Record<string, string> = {}) {
    return api.get('/patients', params);
  },

  getById(id: number | string) {
    return api.get(`/patients/${id}`);
  },

  create(data: Record<string, unknown>) {
    return api.post('/patients', data);
  },

  update(id: number | string, data: Record<string, unknown>) {
    return api.put(`/patients/${id}`, data);
  },
};
