<template>
  <div>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">Search</li>
      </ol>
    </nav>
    <div class="row">
      <div class="col-md-8">
        <div v-if="loading" class="text-center mt-4">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <div v-else-if="error" class="alert alert-danger mt-4">{{ error }}</div>
        <div v-else>
          <div v-if="results.length > 0" class="row row-cols-1 row-cols-sm-2 g-4">
            <div v-for="book in results" :key="book._id" class="col">
              <div class="card h-100">
                <div class="row g-0">
                  <div class="col-md-4">
                     <router-link :to="`/book/detail/${book._id}`">
                        <img :src="book.coverImage" class="img-fluid rounded-start" :alt="book.title" style="height: 100%; object-fit: cover;">
                     </router-link>
                  </div>
                  <div class="col-md-8">
                    <div class="card-body">
                      <h5 class="card-title">{{ book.title }}</h5>
                      <p class="card-text">{{ book.description.substring(0, 120) }}...</p>
                      <p class="card-text"><small class="text-muted">Last updated 3 mins ago</small></p>
                      <router-link v-if="isAdmin" :to="`/book/edit/${book._id}`" class="btn btn-sm btn-outline-secondary">Edit</router-link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="searched" class="text-center mt-4 p-5 border rounded">
            <p>No results found for your query.</p>
          </div>
           <!-- Pagination -->
            <nav v-if="totalPages > 1" class="mt-4">
                <ul class="pagination">
                    <li class="page-item" :class="{ disabled: searchParams.page === 1 }">
                    <a class="page-link" href="#" @click.prevent="changePage(searchParams.page - 1)">Previous</a>
                    </li>
                    <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: page === searchParams.page }">
                    <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
                    </li>
                    <li class="page-item" :class="{ disabled: searchParams.page === totalPages }">
                    <a class="page-link" href="#" @click.prevent="changePage(searchParams.page + 1)">Next</a>
                    </li>
                </ul>
            </nav>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Search</h5>
            <form @submit.prevent="performSearch">
              <div class="mb-3">
                <label for="keyword" class="form-label">Keywords</label>
                <input type="text" id="keyword" class="form-control" v-model="searchParams.keyword">
              </div>
              <div class="mb-3">
                <label for="category" class="form-label">Category</label>
                <select id="category" class="form-select" v-model="searchParams.category">
                  <option value="">Choose...</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="location" class="form-label">Location</label>
                <select id="location" class="form-select" v-model="searchParams.location">
                  <option value="">Choose...</option>
                  <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary w-100">Search</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BookService from '../services/BookService';
import useAuth from '../composables/useAuth';

const route = useRoute();
const router = useRouter();

const searchParams = reactive({
  keyword: '',
  category: '',
  location: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1
});

const results = ref([]);
const totalPages = ref(1);
const loading = ref(false);
const error = ref(null);
const searched = ref(false);
const { hasRole } = useAuth();
const isAdmin = computed(() => hasRole('admin'));

const categories = ref(['Science', 'Technology', 'Engineering', 'Mathematics', 'Arts', 'Literature', 'History', 'Geography', 'Philosophy', 'Psychology', 'Sociology', 'Economics', 'Business', 'Law', 'Medicine', 'Health', 'Education', 'Politics', 'Religion', 'Environment']);
const locations = ref(['Shelf A1', 'Shelf A2', 'Shelf A3', 'Shelf B1', 'Shelf B2', 'Shelf B3', 'Shelf C1', 'Shelf C2', 'Shelf C3']);

const updateStateFromQuery = () => {
  searchParams.keyword = route.query.keyword || '';
  searchParams.category = route.query.category || '';
  searchParams.location = route.query.location || '';
  searchParams.sortBy = route.query.sortBy || 'createdAt';
  searchParams.sortOrder = route.query.sortOrder || 'desc';
  searchParams.page = parseInt(route.query.page) || 1;
};

const performSearch = async () => {
  // Reset page to 1 for new searches, but not for pagination clicks
  if (searchParams.page === 1) {
    router.push({ query: { ...searchParams, page: 1 } });
  } else {
     router.push({ query: { ...searchParams } });
  }

  loading.value = true;
  error.value = null;
  searched.value = true;

  try {
    const response = await BookService.getBooks(searchParams);
    results.value = response.data.data;
    totalPages.value = response.data.totalPages;
  } catch (err) {
    error.value = 'Failed to perform search.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const changePage = (page) => {
  if (page > 0 && page <= totalPages.value) {
    searchParams.page = page;
    performSearch();
  }
};

onMounted(() => {
  updateStateFromQuery();
  // Perform search on mount if there are query params
  if (Object.keys(route.query).length > 0) {
    performSearch();
  }
});

// Watch for changes in the route query and re-run the search
watch(() => route.query, (newQuery) => {
    updateStateFromQuery();
    // Only search if there's a query, otherwise we get an empty search on page load
    if (Object.keys(newQuery).length > 0) {
        performSearch();
    } else {
        // Clear results if query is empty
        results.value = [];
        searched.value = false;
        totalPages.value = 1;
    }
}, { deep: true });

</script>
