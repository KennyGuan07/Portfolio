import httpClient from './httpClient';

export default {
  borrowBook(bookId, payload = {}) {
    return httpClient.post(`/books/${bookId}/borrow`, payload);
  },
  returnBook(bookId, payload = {}) {
    return httpClient.post(`/books/${bookId}/return`, payload);
  },
  getBorrowStatus(bookId) {
    return httpClient.get(`/books/${bookId}/borrow-status`);
  },
  getBorrowHistory(bookId, params) {
    return httpClient.get(`/books/${bookId}/borrow-history`, { params });
  },
  getMyBorrowRecords(params) {
    return httpClient.get('/borrow/my', { params });
  }
};
