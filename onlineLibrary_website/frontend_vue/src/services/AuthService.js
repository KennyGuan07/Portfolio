import httpClient from './httpClient';

export default {
  login(credentials) {
    return httpClient.post('/auth/login', credentials);
  },
  getProfile() {
    return httpClient.get('/auth/profile');
  }
};
