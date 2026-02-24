<template>
  <div>
     <div v-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    
    <div v-if="book">
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
                <li class="breadcrumb-item"><router-link to="/books">Books</router-link></li>
                <li class="breadcrumb-item"><router-link :to="`/book/detail/${book._id}`">{{ book.title }}</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">Edit</li>
            </ol>
        </nav>
        <h2>Edit Book</h2>
    </div>

    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
     <div v-if="errorMessage" class="alert alert-danger">
        <p>{{ errorMessage }}</p>
        <ul v-if="validationErrors.length > 0">
            <li v-for="(err, index) in validationErrors" :key="index">{{ err.field }}: {{ err.message }}</li>
        </ul>
    </div>

    <form v-if="book" @submit.prevent="updateBook">
      <div class="row">
        <div class="col-md-8">
          <div class="mb-3">
            <label for="title" class="form-label">Title</label>
            <input type="text" id="title" class="form-control" v-model="book.title" required>
          </div>
           <div class="mb-3">
            <label for="description" class="form-label">Description</label>
            <textarea id="description" class="form-control" v-model="book.description" rows="5" required></textarea>
          </div>
        </div>
        <div class="col-md-4">
           <div class="mb-3">
            <label for="location" class="form-label">Location</label>
            <select id="location" class="form-select" v-model="book.location" required>
                <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
            </div>
        </div>
      </div>
       <div class="row">
        <div class="col-md-4 mb-3">
            <label for="isbn" class="form-label">ISBN</label>
            <input type="text" id="isbn" class="form-control" v-model="book.isbn" required>
        </div>
        <div class="col-md-4 mb-3">
            <label for="author" class="form-label">Author</label>
            <input type="text" id="author" class="form-control" v-model="book.author" required>
        </div>
         <div class="col-md-4 mb-3">
            <label for="year" class="form-label">Year</label>
            <input type="number" id="year" class="form-control" v-model.number="book.year" required>
        </div>
      </div>
       <div class="row">
         <div class="col-md-4 mb-3">
            <label for="coverImage" class="form-label">Cover Image URL</label>
            <input type="text" id="coverImage" class="form-control" v-model="book.coverImage" required>
        </div>
        <div class="col-md-4 mb-3">
            <label for="publisher" class="form-label">Publisher</label>
            <input type="text" id="publisher" class="form-control" v-model="book.publisher" required>
        </div>
        <div class="col-md-4 mb-3">
            <label for="category" class="form-label">Category</label>
            <select id="category" class="form-select" v-model="book.category" required>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
        </div>
      </div>
       <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" id="isHighlighted" v-model="book.isHighlighted">
        <label class="form-check-label" for="isHighlighted">Highlight</label>
      </div>
      <button type="submit" class="btn btn-primary">Save</button>
      <button type="button" class="btn btn-danger ms-2" @click="deleteBook">Delete</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BookService from '../services/BookService';

const route = useRoute();
const router = useRouter();
const book = ref(null);
const loading = ref(true);
const error = ref(null);
const successMessage = ref('');
const errorMessage = ref('');
const validationErrors = ref([]);

const categories = ref(['Science', 'Technology', 'Engineering', 'Mathematics', 'Arts', 'Literature', 'History', 'Geography', 'Philosophy', 'Psychology', 'Sociology', 'Economics', 'Business', 'Law', 'Medicine', 'Health', 'Education', 'Politics', 'Religion', 'Environment']);
const locations = ref(['Shelf A1', 'Shelf A2', 'Shelf A3', 'Shelf B1', 'Shelf B2', 'Shelf B3', 'Shelf C1', 'Shelf C2', 'Shelf C3']);

onMounted(async () => {
  try {
    const response = await BookService.getBook(route.params.id);
    book.value = response.data;
  } catch (err) {
    error.value = 'Failed to load book data.';
    console.error(err);
  } finally {
    loading.value = false;
  }
});

const updateBook = async () => {
  successMessage.value = '';
  errorMessage.value = '';
  validationErrors.value = [];

  try {
    // Ensure book.value contains the full book object before updating
    if (!book.value) {
        errorMessage.value = "Book data is not loaded yet.";
        return;
    }
    await BookService.updateBook(route.params.id, book.value);
    successMessage.value = 'Book updated successfully!';
    setTimeout(() => router.push(`/book/detail/${route.params.id}`), 1500);
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'An error occurred while updating the book.';
     if (err.response?.data?.errors) {
        validationErrors.value = err.response.data.errors;
    }
    console.error(err);
  }
};

const deleteBook = async () => {
  if (confirm('Are you sure you want to delete this book?')) {
    try {
      await BookService.deleteBook(route.params.id);
      alert('Book deleted successfully.');
      router.push('/books');
    } catch (err) {
      alert('Failed to delete book.');
      console.error(err);
    }
  }
};
</script>
