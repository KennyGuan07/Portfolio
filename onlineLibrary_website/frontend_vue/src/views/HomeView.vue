<template>
  <div class="home">
    <!-- Highlighted Books Carousel -->
    <div v-if="highlightedBooks.length > 0" id="highlightedCarousel" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-inner">
        <div v-for="(book, index) in highlightedBooks" :key="book._id" :class="['carousel-item', { active: index === 0 }]">
          <router-link :to="`/book/detail/${book._id}`">
            <div class="d-flex justify-content-center align-items-center" style="height: 400px; background-color: #e9ecef;">
              <img :src="book.coverImage" class="d-block" :alt="book.title" style="height: 100%; width: auto; object-fit: contain;">
            </div>
          </router-link>
        </div>
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#highlightedCarousel" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#highlightedCarousel" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>
     <div v-else class="text-center p-5 border rounded">
        <p>No highlighted books available at the moment.</p>
    </div>


    <!-- Tab Navigation for Latest, Trending, and Hot Books -->
    <ul class="nav nav-tabs mt-5" id="bookTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="new-tab" data-bs-toggle="tab" data-bs-target="#new" type="button" role="tab" aria-controls="new" aria-selected="true">New</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="trending-tab" data-bs-toggle="tab" data-bs-target="#trending" type="button" role="tab" aria-controls="trending" aria-selected="false">Trending</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="hot-tab" data-bs-toggle="tab" data-bs-target="#hot" type="button" role="tab" aria-controls="hot" aria-selected="false">Hot</button>
      </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content" id="bookTabsContent">
      <!-- New Books Tab -->
      <div class="tab-pane fade show active" id="new" role="tabpanel" aria-labelledby="new-tab">
        <div v-if="latestBooks.length > 0" class="list-group mt-3">
          <router-link v-for="book in latestBooks" :key="book._id" :to="`/book/detail/${book._id}`" class="list-group-item list-group-item-action">
            <div class="d-flex w-100">
              <img :src="book.coverImage" :alt="book.title" style="width: 64px; height: 96px; object-fit: cover; margin-right: 15px;">
              <div class="flex-grow-1">
                <h5 class="mb-1">{{ book.title }}</h5>
                <p class="mb-1">{{ book.description.substring(0, 150) }}...</p>
                <small>By {{ book.author }} in {{ book.location }}</small>
              </div>
            </div>
          </router-link>
        </div>
        <div v-else class="text-center p-5 border rounded mt-3">
          <p>No new books to display.</p>
        </div>
      </div>
      <!-- Trending Books Tab -->
      <div class="tab-pane fade" id="trending" role="tabpanel" aria-labelledby="trending-tab">
        <div v-if="trendingBooks.length > 0" class="list-group mt-3">
           <router-link v-for="book in trendingBooks" :key="book._id" :to="`/book/detail/${book._id}`" class="list-group-item list-group-item-action">
            <div class="d-flex w-100">
              <img :src="book.coverImage" :alt="book.title" style="width: 64px; height: 96px; object-fit: cover; margin-right: 15px;">
              <div class="flex-grow-1">
                <h5 class="mb-1">{{ book.title }}</h5>
                <p class="mb-1">{{ book.description.substring(0, 150) }}...</p>
                <small>By {{ book.author }} - {{ book.viewCount }} views</small>
              </div>
            </div>
          </router-link>
        </div>
        <div v-else class="text-center p-5 border rounded mt-3">
          <p>No trending books right now.</p>
        </div>
      </div>
      <!-- Hot Books Tab -->
      <div class="tab-pane fade" id="hot" role="tabpanel" aria-labelledby="hot-tab">
        <div v-if="hotBooks.length > 0" class="list-group mt-3">
          <router-link v-for="book in hotBooks" :key="book._id" :to="`/book/detail/${book._id}`" class="list-group-item list-group-item-action">
            <div class="d-flex w-100">
              <img :src="book.coverImage" :alt="book.title" style="width: 64px; height: 96px; object-fit: cover; margin-right: 15px;">
              <div class="flex-grow-1">
                <h5 class="mb-1">{{ book.title }}</h5>
                <p class="mb-1">{{ book.description.substring(0, 150) }}...</p>
                <small>By {{ book.author }} · {{ book.publisher }}</small>
              </div>
            </div>
          </router-link>
        </div>
        <div v-else class="text-center p-5 border rounded mt-3">
          <p>No hot books right now.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import BookService from '../services/BookService';

const highlightedBooks = ref([]);
const latestBooks = ref([]);
const trendingBooks = ref([]);
const hotBooks = ref([]);

onMounted(async () => {
  try {
    // Fetch highlighted books
    const highlightedResponse = await BookService.getBooks({ isHighlighted: true, limit: 5 });
    highlightedBooks.value = highlightedResponse.data.data;

    // Fetch latest 6 books
    const latestResponse = await BookService.getBooks({ sortBy: 'createdAt', sortOrder: 'desc', limit: 6 });
    latestBooks.value = latestResponse.data.data;

    // Fall back to latest titles if no highlights are marked
    if (highlightedBooks.value.length === 0 && latestBooks.value.length > 0) {
      highlightedBooks.value = latestBooks.value.slice(0, Math.min(3, latestBooks.value.length));
    }

    // Fetch top 6 trending books prioritising view counts
    const trendingResponse = await BookService.getBooks({ sortBy: 'viewCount', sortOrder: 'desc', limit: 6 });
    trendingBooks.value = trendingResponse.data.data;

    // Ensure trending tab is populated even when view counts are tied at 0
    if (trendingBooks.value.length === 0 && latestBooks.value.length > 0) {
      trendingBooks.value = latestBooks.value.slice(0, Math.min(6, latestBooks.value.length));
    }

    // Populate "Hot" titles by most recent updates
    const hotResponse = await BookService.getBooks({ sortBy: 'updatedAt', sortOrder: 'desc', limit: 6 });
    hotBooks.value = hotResponse.data.data;

    if (hotBooks.value.length === 0 && trendingBooks.value.length > 0) {
      hotBooks.value = trendingBooks.value.slice(0, Math.min(6, trendingBooks.value.length));
    } else if (hotBooks.value.length === 0 && latestBooks.value.length > 0) {
      hotBooks.value = latestBooks.value.slice(0, Math.min(6, latestBooks.value.length));
    }

  } catch (error) {
    console.error('Error fetching books:', error);
  }
});
</script>
