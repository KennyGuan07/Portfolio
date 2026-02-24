import httpClient from './httpClient';

export default {
  listUsers(params) {
    return httpClient.get('/users', { params });
  },
  createUser(payload) {
    return httpClient.post('/users', payload);
  },
  getUser(id) {
    return httpClient.get(`/users/${id}`);
  },
  updateUser(id, payload) {
    return httpClient.put(`/users/${id}`, payload);
  },
  deleteUser(id) {
    return httpClient.delete(`/users/${id}`);
  },
  getBorrowHistory(id, params) {
    return httpClient.get(`/users/${id}/borrow-history`, { params });
  }
};
