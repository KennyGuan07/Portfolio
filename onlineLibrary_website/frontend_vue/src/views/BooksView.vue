<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Books</li>
        </ol>
      </nav>
      <router-link v-if="isAdmin" to="/book/add" class="btn btn-primary">Add</router-link>
    </div>

    <div v-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div v-if="books.length > 0" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
        <div v-for="book in books" :key="book._id" class="col">
          <div class="card h-100">
            <router-link :to="`/book/detail/${book._id}`">
              <img :src="book.coverImage" class="card-img-top" :alt="book.title" style="height: 200px; object-fit: cover;">
            </router-link>
            <div class="card-body">
              <h5 class="card-title">{{ book.title }}</h5>
              <p class="card-text">{{ book.description.substring(0, 100) }}...</p>
            </div>
            <div class="card-footer" v-if="isAdmin">
              <router-link :to="`/book/edit/${book._id}`" class="btn btn-sm btn-outline-secondary">Edit</router-link>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center mt-4">
        <p>No books found.</p>
      </div>

      <!-- Pagination -->
      <nav v-if="totalPages > 1" class="mt-4">
        <ul class="pagination justify-content-center">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">Previous</a>
          </li>
          <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: page === currentPage }">
            <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">Next</a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import BookService from '../services/BookService';
import useAuth from '../composables/useAuth';

const books = ref([]);
const loading = ref(true);
const error = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);
const { hasRole } = useAuth();
const isAdmin = computed(() => hasRole('admin'));

const fetchBooks = async () => {
  loading.value = true;
  error.value = null;
  try {
    const params = {
      page: currentPage.value,
      limit: 6,
    };
    const response = await BookService.getBooks(params);
    books.value = response.data.data;
    totalPages.value = response.data.totalPages;
  } catch (err) {
    error.value = 'Failed to load books.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const changePage = (page) => {
  if (page > 0 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

onMounted(fetchBooks);

watch(currentPage, fetchBooks);
</script>
