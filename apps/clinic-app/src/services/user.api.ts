import { api } from './api';

/**
 * User/Staff API service.
 */
export const userApi = {
  getStaff() {
    return api.get('/users/staff');
  },

  createStaff(data) {
    return api.post('/users/staff', data);
  },

  updateStaff(id, data) {
    return api.put(`/users/staff/${id}`, data);
  },

  deleteStaff(id) {
    return api.delete(`/users/staff/${id}`);
  },

  heartbeat() {
    return api.post('/users/heartbeat');
  },
};
