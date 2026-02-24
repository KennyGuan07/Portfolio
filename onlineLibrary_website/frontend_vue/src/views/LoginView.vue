<template>
  <div class="row justify-content-center">
    <div class="col-md-6 col-lg-4">
      <div class="card shadow-sm">
        <div class="card-body">
          <h1 class="h4 mb-3 text-center">Sign In</h1>
          <p v-if="route.query.redirect" class="alert alert-info">Please sign in to continue.</p>
          <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input id="email" v-model="form.email" type="email" class="form-control" required autocomplete="username" />
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <input id="password" v-model="form.password" type="password" class="form-control" required autocomplete="current-password" />
            </div>
            <button type="submit" class="btn btn-primary w-100" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ submitting ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import useAuth from '../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { login, isAuthenticated, error } = useAuth();

const form = reactive({
  email: '',
  password: ''
});

const submitting = ref(false);
const formError = ref('');

watchEffect(() => {
  if (error.value) {
    formError.value = error.value;
  }
});

if (isAuthenticated.value) {
  router.replace(route.query.redirect || '/');
}

const handleSubmit = async () => {
  submitting.value = true;
  formError.value = '';
  try {
    await login({ ...form });
    const target = route.query.redirect || '/';
    router.replace(target);
  } catch (err) {
    formError.value = err.response?.data?.message || 'Invalid credentials. Please try again.';
  } finally {
    submitting.value = false;
  }
};
</script>
