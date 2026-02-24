<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">Users</li>
      </ol>
    </nav>

    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Users</h2>
      </div>
      <div class="d-flex flex-column align-items-stretch gap-2" style="min-width: 120px;">
        <button class="btn btn-primary" type="button" @click="goToCreate">Add</button>
      </div>
    </div>

    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body">
        <label class="form-label text-uppercase fw-semibold small text-secondary">Search</label>
        <div class="input-group">
          <input
            class="form-control"
            v-model="filters.keyword"
            placeholder="Search by email, first or last name"
          />
          <button class="btn btn-outline-secondary" type="button" @click="resetFilters" :disabled="!filters.keyword">
            Clear
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div class="card shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col">Email</th>
              <th scope="col">First Name</th>
              <th scope="col">Last Name</th>
              <th scope="col">Role</th>
              <th scope="col" class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="5" class="text-center text-muted py-4">No users found.</td>
            </tr>
            <tr v-else v-for="user in users" :key="user._id">
              <td>
                <a :href="`mailto:${user.email}`" class="text-decoration-none">{{ user.email }}</a>
              </td>
              <td>{{ user.firstName || '—' }}</td>
              <td>{{ user.lastName || '—' }}</td>
              <td><span class="badge bg-primary text-uppercase">{{ user.role }}</span></td>
              <td class="text-end">
                <div class="d-inline-flex gap-3">
                  <button class="btn btn-link btn-sm text-decoration-none" @click="goToEdit(user)">Edit</button>
                  <button class="btn btn-link btn-sm text-danger text-decoration-none" @click="confirmDelete(user)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-3">
        <small class="text-muted">Total: {{ pagination.total }} users</small>
        <ul class="pagination mb-0">
          <li class="page-item" :class="{ disabled: pagination.page === 1 }">
            <button class="page-link" type="button" @click="goToPage(pagination.page - 1)" :disabled="pagination.page === 1">Previous</button>
          </li>
          <li
            v-for="page in visiblePages"
            :key="page"
            class="page-item"
            :class="{ active: pagination.page === page }"
          >
            <button class="page-link" type="button" @click="goToPage(page)">{{ page }}</button>
          </li>
          <li class="page-item" :class="{ disabled: pagination.page === totalPages }">
            <button class="page-link" type="button" @click="goToPage(pagination.page + 1)" :disabled="pagination.page === totalPages">Next</button>
          </li>
        </ul>
      </div>
    </div>

    <o-modal v-model:active="deleteDialog.open" has-modal-card :width="420">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Delete User</p>
          <button class="delete" aria-label="close" @click="deleteDialog.open = false"></button>
        </header>
        <section class="modal-card-body">
          Are you sure you want to delete <strong>{{ deleteDialog.target?.email }}</strong>? This cannot be undone.
        </section>
        <footer class="modal-card-foot">
          <button class="button is-danger" @click="deleteUser" :disabled="deleteDialog.loading">
            <span v-if="deleteDialog.loading" class="spinner-border spinner-border-sm me-2"></span>
            Delete
          </button>
          <button class="button" @click="deleteDialog.open = false" :disabled="deleteDialog.loading">Cancel</button>
        </footer>
      </div>
    </o-modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import UserService from '../services/UserService'

const users = ref([])
const loading = ref(false)
const error = ref('')
const pagination = reactive({ page: 1, limit: 10, total: 0 })
const filters = reactive({ keyword: '' })
const router = useRouter()
const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit) || 1))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = pagination.page
  const delta = 2
  const pages = []
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)

  if (end - start < delta * 2) {
    if (start === 1) {
      end = Math.min(total, start + delta * 2)
    } else if (end === total) {
      start = Math.max(1, end - delta * 2)
    }
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const deleteDialog = reactive({
  open: false,
  loading: false,
  target: null
})

const fetchUsers = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
    if (filters.keyword) {
      params.keyword = filters.keyword
    }
    const { data } = await UserService.listUsers(params)
    users.value = data.data
    pagination.total = data.total
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

const refresh = () => {
  pagination.page = 1
  fetchUsers()
}

const resetFilters = () => {
  if (filters.keyword) {
    filters.keyword = ''
  }
}

const goToCreate = () => {
  router.push({ name: 'admin-user-create' })
}

const goToEdit = (user) => {
  router.push({ name: 'admin-user-edit', params: { id: user._id } })
}

const confirmDelete = (user) => {
  deleteDialog.target = user
  deleteDialog.open = true
}

const deleteUser = async () => {
  if (!deleteDialog.target) return
  deleteDialog.loading = true
  try {
    await UserService.deleteUser(deleteDialog.target._id)
    deleteDialog.open = false
    refresh()
  } catch (err) {
    alert(err.response?.data?.message || 'Unable to delete user.')
  } finally {
    deleteDialog.loading = false
  }
}

watch(() => pagination.page, fetchUsers)
watch(
  () => [filters.keyword, pagination.limit],
  () => {
    pagination.page = 1
    fetchUsers()
  }
)

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value || page === pagination.page) {
    return
  }
  pagination.page = page
}

onMounted(fetchUsers)
</script>
