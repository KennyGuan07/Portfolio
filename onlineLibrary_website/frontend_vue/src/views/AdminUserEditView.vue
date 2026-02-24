<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item"><router-link to="/admin/users">Users</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">Edit</li>
      </ol>
    </nav>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="loadError" class="alert alert-danger">{{ loadError }}</div>

    <div v-else class="row g-4 align-items-start">
      <div class="col-xl-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <form @submit.prevent="handleSave">
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input class="form-control" type="email" v-model.trim="form.email" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input class="form-control" type="password" v-model.trim="form.password" placeholder="Leave blank to keep current" />
              </div>
              <div class="mb-3">
                <label class="form-label">Confirm password</label>
                <input class="form-control" type="password" v-model.trim="form.confirmPassword" placeholder="Repeat new password" />
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">First Name</label>
                  <input class="form-control" v-model.trim="form.firstName" />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Last Name</label>
                  <input class="form-control" v-model.trim="form.lastName" />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label d-block">Role</label>
                <div class="form-check">
                  <input class="form-check-input" type="radio" id="edit-role-user" value="user" v-model="form.role" />
                  <label class="form-check-label" for="edit-role-user">User</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" id="edit-role-admin" value="admin" v-model="form.role" />
                  <label class="form-check-label" for="edit-role-admin">Admin</label>
                </div>
              </div>

              <div v-if="formMessage" class="alert alert-success">{{ formMessage }}</div>
              <div v-if="formError" class="alert alert-danger">{{ formError }}</div>

              <div class="d-flex flex-wrap gap-3 mt-4">
                <button class="btn btn-primary" type="submit" :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                  Save
                </button>
                <button class="btn btn-outline-secondary" type="button" @click="goBack" :disabled="submitting || deleting">
                  Cancel
                </button>
              </div>
            </form>

            <button class="btn btn-danger mt-4" type="button" @click="handleDelete" :disabled="deleting || submitting">
              <span v-if="deleting" class="spinner-border spinner-border-sm me-2"></span>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div class="col-xl-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1">Borrow history</h5>
              <small class="text-muted">Most recent activity</small>
            </div>
            <button class="btn btn-outline-primary btn-sm" type="button" @click="loadBorrowHistory" :disabled="historyLoading">
              Refresh
            </button>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Book title</th>
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
                    <td colspan="3" class="text-center text-muted py-4">No borrow records.</td>
                  </tr>
                  <tr v-else v-for="record in borrowHistory" :key="record._id">
                    <td>
                      <router-link
                        v-if="record.bookId?._id"
                        class="text-decoration-none"
                        :to="{ name: 'book-detail', params: { id: record.bookId._id } }"
                      >
                        {{ record.bookId?.title || 'Unknown' }}
                      </router-link>
                      <span v-else>{{ record.bookId?.title || 'Unknown' }}</span>
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
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserService from '../services/UserService'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const deleting = ref(false)
const formMessage = ref('')
const formError = ref('')

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  role: 'user'
})

const borrowHistory = ref([])
const historyLoading = ref(false)
const historyPagination = reactive({ page: 1, limit: 5, total: 0 })

const historyTotalPages = computed(() => Math.max(1, Math.ceil((historyPagination.total || 0) / historyPagination.limit) || 1))
const historyVisiblePages = computed(() => {
  const total = historyTotalPages.value
  const current = historyPagination.page
  const delta = 1
  const pages = []
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)

  while (end - start < delta * 2 && (start > 1 || end < total)) {
    if (start > 1) start -= 1
    else if (end < total) end += 1
    else break
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

const goBack = () => {
  router.push({ name: 'admin-users' })
}

const fetchUser = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await UserService.getUser(route.params.id)
    form.email = data.email || ''
    form.firstName = data.firstName || ''
    form.lastName = data.lastName || ''
    form.role = data.role || 'user'
    form.password = ''
    form.confirmPassword = ''
  } catch (err) {
    loadError.value = err.response?.data?.message || 'Unable to load user details.'
  } finally {
    loading.value = false
  }
}

const loadBorrowHistory = async () => {
  historyLoading.value = true
  try {
    const { data } = await UserService.getBorrowHistory(route.params.id, {
      page: historyPagination.page,
      limit: historyPagination.limit
    })
    borrowHistory.value = data.data
    historyPagination.total = data.total
  } catch (err) {
    console.error(err)
  } finally {
    historyLoading.value = false
  }
}

const validateForm = () => {
  formError.value = ''
  formMessage.value = ''
  if (!form.email) {
    formError.value = 'Email is required.'
    return false
  }
  if ((form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
    formError.value = 'Passwords do not match.'
    return false
  }
  return true
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }
  submitting.value = true
  try {
    const payload = {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role
    }
    if (form.password) {
      payload.password = form.password
    }
    await UserService.updateUser(route.params.id, payload)
    formMessage.value = 'User updated successfully.'
    form.password = ''
    form.confirmPassword = ''
  } catch (err) {
    formError.value = err.response?.data?.message || 'Unable to update user.'
  } finally {
    submitting.value = false
  }
}

const handleDelete = async () => {
  if (deleting.value) return
  if (!confirm('Delete this user? This cannot be undone.')) {
    return
  }
  deleting.value = true
  try {
    await UserService.deleteUser(route.params.id)
    router.push({ name: 'admin-users' })
  } catch (err) {
    formError.value = err.response?.data?.message || 'Unable to delete user.'
  } finally {
    deleting.value = false
  }
}

const goToHistoryPage = (page) => {
  if (page < 1 || page > historyTotalPages.value || page === historyPagination.page) {
    return
  }
  historyPagination.page = page
}

watch(() => route.params.id, async (newId) => {
  if (!newId) return
  historyPagination.page = 1
  await fetchUser()
  await loadBorrowHistory()
})

watch(() => historyPagination.page, () => {
  loadBorrowHistory()
})

onMounted(async () => {
  await fetchUser()
  await loadBorrowHistory()
})
</script>
