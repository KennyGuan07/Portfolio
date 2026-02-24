import httpClient from './httpClient';

export default {
  getBooks(params) {
    return httpClient.get('/books', { params });
  },
  getBook(id) {
    return httpClient.get(`/books/${id}`);
  },
  createBook(data) {
    return httpClient.post('/books', data);
  },
  updateBook(id, data) {
    return httpClient.put(`/books/${id}`, data);
  },
  deleteBook(id) {
    return httpClient.delete(`/books/${id}`);
  }
};
