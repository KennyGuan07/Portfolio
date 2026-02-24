<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom">
    <div class="container-fluid">
      <router-link class="navbar-brand" to="/">Online Library</router-link>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <router-link class="nav-link" to="/">Home</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/books">Books</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/search">Search</router-link>
          </li>
          <li class="nav-item" v-if="isAdmin">
            <router-link class="nav-link" to="/admin/users">Users</router-link>
          </li>
        </ul>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-primary btn-sm" @click="handlePrimaryAction">{{ primaryLabel }}</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import useAuth from '../composables/useAuth'

const router = useRouter()
const { isAuthenticated, hasRole, logout } = useAuth()

const isAdmin = computed(() => hasRole('admin'))
const primaryLabel = computed(() => (isAuthenticated.value ? 'Logout' : 'Sign In'))

const handlePrimaryAction = () => {
  if (isAuthenticated.value) {
    logout()
    router.push({ name: 'home' })
    return
  }
  router.push({ name: 'login' })
}
</script>
