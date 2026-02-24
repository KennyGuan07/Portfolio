<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item"><router-link to="/admin/users">Users</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">Add</li>
      </ol>
    </nav>

    <div class="card shadow-sm border-0">
      <div class="card-body">
        <form class="user-create-form" @submit.prevent="handleSubmit">
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input class="form-control" type="email" v-model.trim="form.email" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Password</label>
              <input class="form-control" type="password" v-model.trim="form.password" required minLength="6" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Confirm password</label>
              <input class="form-control" type="password" v-model.trim="form.confirmPassword" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">First Name</label>
              <input class="form-control" v-model.trim="form.firstName" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Last Name</label>
              <input class="form-control" v-model.trim="form.lastName" />
            </div>
            <div class="col-md-6">
              <label class="form-label d-block">Role</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" id="role-user" value="user" v-model="form.role" />
                <label class="form-check-label" for="role-user">User</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" id="role-admin" value="admin" v-model="form.role" />
                <label class="form-check-label" for="role-admin">Admin</label>
              </div>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger mt-4 mb-0">{{ error }}</div>
          <div v-if="success" class="alert alert-success mt-4 mb-0">{{ success }}</div>

          <div class="mt-4 d-flex gap-3">
            <button class="btn btn-primary" type="submit" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
              Save
            </button>
            <button class="btn btn-outline-secondary" type="button" @click="goBack" :disabled="submitting">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserService from '../services/UserService'

const router = useRouter()
const submitting = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  role: 'user'
})

const resetFeedback = () => {
  error.value = ''
  success.value = ''
}

const validateForm = () => {
  if (!form.email || !form.password || !form.confirmPassword) {
    error.value = 'Please fill in all required fields.'
    return false
  }
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match.'
    return false
  }
  return true
}

const goBack = () => {
  router.push({ name: 'admin-users' })
}

const handleSubmit = async () => {
  resetFeedback()
  if (!validateForm()) {
    return
  }
  submitting.value = true
  try {
    const payload = {
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role
    }
    await UserService.createUser(payload)
    success.value = 'User created successfully.'
    setTimeout(() => {
      goBack()
    }, 500)
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to create user.'
  } finally {
    submitting.value = false
  }
}
</script>
