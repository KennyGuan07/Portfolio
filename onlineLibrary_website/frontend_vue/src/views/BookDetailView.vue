<template>
  <div v-if="loading" class="text-center">
    <div class="spinner-border" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
  <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
  <div v-else-if="book">
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item"><router-link to="/books">Books</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">{{ book.title }}</li>
      </ol>
    </nav>
    <div class="row gx-4 gy-4 align-items-start">
      <div class="col-lg-9">
        <div class="card shadow-sm border-0 h-100 book-detail-card">
          <div class="row g-0 flex-md-row flex-column">
            <div class="col-md-4 col-lg-3 border-end">
              <div class="book-cover-wrapper rounded-start rounded-top">
                <img
                  :src="book.coverImage || book.image || defaultCoverImage"
                  :alt="book.title"
                  class="img-fluid book-cover-img"
                >
              </div>
            </div>
            <div class="col-md-8 col-lg-9">
              <div class="card-body text-start p-4">
                <nav class="small text-muted mb-3">Book / <span class="text-dark">{{ book.title }}</span></nav>
                <h3 class="card-title mb-3 text-capitalize">{{ book.title }}</h3>
                <p class="card-text text-muted fs-6 lh-base">
                  {{ book.description || 'No description available for this title.' }}
                </p>
                <p class="mb-1"><small class="text-muted">Viewed {{ book.viewCount }} times</small></p>
                <router-link
                  v-if="isAdmin"
                  :to="`/book/edit/${book._id}`"
                  class="btn btn-outline-primary btn-sm mt-3"
                >
                  Edit Book
                </router-link>
              </div>
              <div class="table-responsive border-top mt-3">
                <table class="table table-sm mb-0">
                  <tbody>
                    <tr>
                      <th class="fw-semibold text-uppercase text-muted small">ISBN</th>
                      <td>{{ book.isbn || '—' }}</td>
                    </tr>
                    <tr>
                      <th class="fw-semibold text-uppercase text-muted small">Author</th>
                      <td>{{ book.author || '—' }}</td>
                    </tr>
                    <tr>
                      <th class="fw-semibold text-uppercase text-muted small">Publisher</th>
                      <td>{{ book.publisher || '—' }}</td>
                    </tr>
                    <tr>
                      <th class="fw-semibold text-uppercase text-muted small">Year</th>
                      <td>{{ book.year || '—' }}</td>
                    </tr>
                    <tr>
                      <th class="fw-semibold text-uppercase text-muted small">Category</th>
                      <td>{{ book.category || '—' }}</td>
                    </tr>
                    <tr>
                      <th class="fw-semibold text-uppercase text-muted small">Location</th>
                      <td>{{ book.location || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3" v-if="isAdmin">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1">Borrow history</h5>
              <small class="text-muted">Latest records first</small>
            </div>
            <button class="btn btn-outline-primary btn-sm" @click="loadBorrowHistory" :disabled="historyLoading">
              Refresh
            </button>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Borrow date</th>
                    <th>Return date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="historyLoading">
                    <td colspan="3" class="text-center py-4">
                      <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="!borrowHistory.length">
                    <td colspan="3" class="text-center text-muted py-4">No borrow records yet.</td>
                  </tr>
                  <tr v-else v-for="record in borrowHistory" :key="record._id">
                    <td>
                      <a :href="`mailto:${record.userId?.email}`" class="text-decoration-none">{{ record.userId?.email || 'Unknown' }}</a>
                    </td>
                    <td>{{ formatDate(record.borrowDate) }}</td>
                    <td>{{ record.returnDate ? formatDate(record.returnDate) : '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white border-0 pt-0">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <small class="text-muted">Total: {{ historyPagination.total }} records</small>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: historyPagination.page === 1 }">
                  <button class="page-link" type="button" @click="goToHistoryPage(historyPagination.page - 1)" :disabled="historyPagination.page === 1">Previous</button>
                </li>
                <li
                  v-for="page in historyVisiblePages"
                  :key="`history-${page}`"
                  class="page-item"
                  :class="{ active: historyPagination.page === page }"
                >
                  <button class="page-link" type="button" @click="goToHistoryPage(page)">{{ page }}</button>
                </li>
                <li class="page-item" :class="{ disabled: historyPagination.page === historyTotalPages }">
                  <button class="page-link" type="button" @click="goToHistoryPage(historyPagination.page + 1)" :disabled="historyPagination.page === historyTotalPages">Next</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section v-if="isAuthenticated && !isAdmin" class="mt-4">
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Borrow this book</h5>
          <p class="card-text">
            <span v-if="borrowStatus.isBorrowed">
              You borrowed this book on <strong>{{ formatDate(borrowStatus.activeBorrow?.borrowDate) }}</strong> and it is due on
              <strong>{{ formatDate(borrowStatus.activeBorrow?.dueDate) }}</strong>.
            </span>
            <span v-else>
              This book is available for borrowing. You will have 14 days to return it.
            </span>
          </p>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-success" @click="handleBorrow" :disabled="actionLoading || borrowStatus.isBorrowed">
              <span v-if="actionLoading" class="spinner-border spinner-border-sm me-2"></span>
              Borrow Book
            </button>
            <button
              v-if="borrowStatus.isBorrowed"
              class="btn btn-outline-warning"
              @click="handleReturn"
              :disabled="actionLoading"
            >
              Return Book
            </button>
          </div>
          <div v-if="actionMessage" class="alert alert-info mt-3">{{ actionMessage }}</div>
        </div>
      </div>
    </section>

    <section v-else-if="!isAuthenticated" class="mt-4">
      <div class="card">
        <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <h5 class="card-title mb-1">Want to borrow this book?</h5>
            <p class="mb-0 text-muted">Sign in to reserve and track borrowed items.</p>
          </div>
          <router-link class="btn btn-primary" :to="{ name: 'login', query: { redirect: route.fullPath } }">Sign in</router-link>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import BookService from '../services/BookService';
import BorrowService from '../services/BorrowService';
import useAuth from '../composables/useAuth';

const route = useRoute();
const { hasRole, isAuthenticated } = useAuth();

const book = ref(null);
const defaultCoverImage = 'https://via.placeholder.com/400x600?text=No+Cover';
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(false);
const actionMessage = ref('');
const borrowStatus = reactive({
  isBorrowed: false,
  activeBorrow: null,
  lastRecord: null
});

const borrowHistory = ref([]);
const historyLoading = ref(false);
const historyPagination = reactive({ page: 1, limit: 5, total: 0 });
const historyTotalPages = computed(() => Math.max(1, Math.ceil((historyPagination.total || 0) / historyPagination.limit) || 1));
const historyVisiblePages = computed(() => {
  const total = historyTotalPages.value;
  const current = historyPagination.page;
  const delta = 1;
  const pages = [];
  let start = Math.max(1, current - delta);
  let end = Math.min(total, current + delta);

  while (end - start < delta * 2 && (start > 1 || end < total)) {
    if (start > 1) start -= 1;
    else if (end < total) end += 1;
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
});

const isAdmin = computed(() => hasRole('admin'));

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const resetBorrowStatus = () => {
  borrowStatus.isBorrowed = false;
  borrowStatus.activeBorrow = null;
  borrowStatus.lastRecord = null;
};

const fetchBookData = async (id) => {
  loading.value = true;
  error.value = null;
  try {
    const response = await BookService.getBook(id);
    book.value = response.data;
  } catch (err) {
    error.value = 'Failed to load book details.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const loadBorrowStatus = async () => {
  if (!book.value || !isAuthenticated.value) {
    resetBorrowStatus();
    return;
  }
  actionMessage.value = '';
  try {
    const { data } = await BorrowService.getBorrowStatus(book.value._id);
    borrowStatus.isBorrowed = data.isBorrowed;
    borrowStatus.activeBorrow = data.activeBorrow;
    borrowStatus.lastRecord = data.lastRecord;
  } catch (err) {
    console.error(err);
  }
};

const loadBorrowHistory = async () => {
  if (!book.value || !isAdmin.value) return;
  historyLoading.value = true;
  try {
    const { data } = await BorrowService.getBorrowHistory(book.value._id, {
      page: historyPagination.page,
      limit: historyPagination.limit
    });
    borrowHistory.value = data.data;
    historyPagination.total = data.total;
  } catch (err) {
    console.error(err);
  } finally {
    historyLoading.value = false;
  }
};

const handleBorrow = async () => {
  if (!book.value || !isAuthenticated.value) return;
  actionLoading.value = true;
  actionMessage.value = '';
  try {
    await BorrowService.borrowBook(book.value._id);
    actionMessage.value = 'Book borrowed successfully!';
    await loadBorrowStatus();
    await fetchBookData(book.value._id);
    if (isAdmin.value) {
      await loadBorrowHistory();
    }
  } catch (err) {
    actionMessage.value = err.response?.data?.message || 'Unable to borrow this book right now.';
  } finally {
    actionLoading.value = false;
  }
};

const handleReturn = async () => {
  if (!book.value || !isAuthenticated.value) return;
  actionLoading.value = true;
  actionMessage.value = '';
  try {
    await BorrowService.returnBook(book.value._id);
    actionMessage.value = 'Thanks for returning the book!';
    await loadBorrowStatus();
    await fetchBookData(book.value._id);
    if (isAdmin.value) {
      await loadBorrowHistory();
    }
  } catch (err) {
    actionMessage.value = err.response?.data?.message || 'Unable to return this book.';
  } finally {
    actionLoading.value = false;
  }
};

onMounted(async () => {
  await fetchBookData(route.params.id);
  await loadBorrowStatus();
  if (isAdmin.value) {
    await loadBorrowHistory();
  }
});

watch(() => route.params.id, async (newId) => {
  if (newId) {
    historyPagination.page = 1;
    await fetchBookData(newId);
    await loadBorrowStatus();
    if (isAdmin.value) {
      await loadBorrowHistory();
    }
  }
});

watch(() => historyPagination.page, () => {
  if (isAdmin.value) {
    loadBorrowHistory();
  }
});

const goToHistoryPage = (page) => {
  if (page < 1 || page > historyTotalPages.value || page === historyPagination.page) {
    return;
  }
  historyPagination.page = page;
};

watch(() => isAuthenticated.value, (authed) => {
  if (authed) {
    loadBorrowStatus();
    if (isAdmin.value) {
      loadBorrowHistory();
    }
  } else {
    resetBorrowStatus();
  }
});
</script>

<style scoped>
.book-detail-card {
  margin-left: 0;
}

.book-cover-wrapper {
  width: 100%;
  min-height: 320px;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 991.98px) {
  .book-detail-card {
    margin-left: 0;
  }

  .book-cover-wrapper {
    min-height: 240px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
}
</style>
