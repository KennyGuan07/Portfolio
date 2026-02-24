<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
        <li class="breadcrumb-item active" aria-current="page">My Borrowed Books</li>
      </ol>
    </nav>

    <div class="card mb-3">
      <div class="card-body d-flex flex-wrap gap-3 align-items-end">
        <div>
          <label class="form-label">Status</label>
          <select class="form-select" v-model="filters.status">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
          </select>
        </div>
        <div>
          <label class="form-label">Items per page</label>
          <select class="form-select" v-model.number="pagination.limit">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
        </div>
        <button class="btn btn-outline-secondary" @click="refreshList" :disabled="loading">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <o-table :data="records" :loading="loading" striped hoverable>
      <o-table-column field="title" label="Book" v-slot="props">
        <div class="d-flex align-items-center gap-3">
          <img
            v-if="props.row.bookId?.coverImage"
            :src="props.row.bookId.coverImage"
            alt="cover"
            style="width: 48px; height: 64px; object-fit: cover; border-radius: 4px;"
          />
          <div>
            <router-link :to="`/book/detail/${props.row.bookId?._id || props.row.bookId}`" class="fw-semibold">
              {{ props.row.bookId?.title || 'Unknown title' }}
            </router-link>
            <div class="text-muted small">{{ props.row.bookId?.author }}</div>
          </div>
        </div>
      </o-table-column>
      <o-table-column field="borrowDate" label="Borrowed" v-slot="props">
        {{ formatDate(props.row.borrowDate) }}
      </o-table-column>
      <o-table-column field="dueDate" label="Due" v-slot="props">
        {{ formatDate(props.row.dueDate) }}
      </o-table-column>
      <o-table-column field="returnDate" label="Return" v-slot="props">
        <span v-if="props.row.returnDate">{{ formatDate(props.row.returnDate) }}</span>
        <span v-else class="badge bg-success">Active</span>
      </o-table-column>
      <o-table-column field="status" label="Status" v-slot="props">
        <span :class="statusBadgeClass(props.row.status)">{{ props.row.status }}</span>
      </o-table-column>
      <template #empty>
        <div class="text-center text-muted py-4">No borrow records yet.</div>
      </template>
    </o-table>

    <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
      <small class="text-muted">Total: {{ pagination.total }} records</small>
      <o-pagination
        :total="pagination.total"
        :per-page="pagination.limit"
        v-model:current="pagination.page"
        :simple="true"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import BorrowService from '../services/BorrowService'
const records = ref([])
const loading = ref(false)
const error = ref('')
const pagination = reactive({ page: 1, limit: 10, total: 0 })
const filters = reactive({ status: '' })

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

const statusBadgeClass = (status) => {
  if (status === 'active') return 'badge bg-primary'
  if (status === 'returned') return 'badge bg-secondary'
  return 'badge bg-light text-dark'
}

const fetchRecords = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (filters.status) {
      params.status = filters.status
    }
    const { data } = await BorrowService.getMyBorrowRecords(params)
    records.value = data.data
    pagination.total = data.total
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load borrow records.'
  } finally {
    loading.value = false
  }
}

const refreshList = () => {
  pagination.page = 1
  fetchRecords()
}

watch(() => pagination.page, fetchRecords)
watch(
  () => [filters.status, pagination.limit],
  () => {
    pagination.page = 1
    fetchRecords()
  }
)

onMounted(fetchRecords)
</script>
