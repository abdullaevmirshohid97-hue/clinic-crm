import { api } from './api';

/**
 * User/Staff API service.
 */
export const userApi = {
  getStaff() {
    return api.get('/users/staff');
  },

  createStaff(data: Record<string, unknown>) {
    return api.post('/users/staff', data);
  },

  updateStaff(id: number | string, data: Record<string, unknown>) {
    return api.put(`/users/staff/${id}`, data);
  },

  deleteStaff(id: number | string) {
    return api.delete(`/users/staff/${id}`);
  },

  heartbeat() {
    return api.post('/users/heartbeat');
  },
};
