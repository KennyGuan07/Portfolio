<template>
  <div>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item"><router-link to="/books">Books</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">Add</li>
      </ol>
    </nav>
    <form @submit.prevent="addBook">
      <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <div v-if="errorMessage" class="alert alert-danger">
          <p>{{ errorMessage }}</p>
          <ul v-if="validationErrors.length > 0">
              <li v-for="(err, index) in validationErrors" :key="index">{{ err.field }}: {{ err.message }}</li>
          </ul>
      </div>
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
                <option disabled value="">Select location</option>
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
                <option disabled value="">Please select one</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
        </div>
      </div>
       <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" id="isHighlighted" v-model="book.isHighlighted">
        <label class="form-check-label" for="isHighlighted">Highlight</label>
      </div>
      <button type="submit" class="btn btn-primary">Save</button>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import BookService from '../services/BookService';

const router = useRouter();
const book = reactive({
  title: '',
  author: '',
  isbn: '',
  description: '',
  coverImage: '',
  publisher: '',
  year: null,
  category: '',
  location: '',
  isHighlighted: false
});

const successMessage = ref('');
const errorMessage = ref('');
const validationErrors = ref([]);

const categories = ref(['Science', 'Technology', 'Engineering', 'Mathematics', 'Arts', 'Literature', 'History', 'Geography', 'Philosophy', 'Psychology', 'Sociology', 'Economics', 'Business', 'Law', 'Medicine', 'Health', 'Education', 'Politics', 'Religion', 'Environment']);
const locations = ref(['Shelf A1', 'Shelf A2', 'Shelf A3', 'Shelf B1', 'Shelf B2', 'Shelf B3', 'Shelf C1', 'Shelf C2', 'Shelf C3']);

const addBook = async () => {
  successMessage.value = '';
  errorMessage.value = '';
  validationErrors.value = [];

  try {
    const response = await BookService.createBook(book);
    successMessage.value = 'Book added successfully!';
    setTimeout(() => router.push(`/book/detail/${response.data._id}`), 1500);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'An error occurred while adding the book.';
    if (error.response?.data?.errors) {
        validationErrors.value = error.response.data.errors;
    }
    console.error(error);
  }
};
</script>
