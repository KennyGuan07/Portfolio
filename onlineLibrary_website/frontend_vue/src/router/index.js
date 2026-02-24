import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import useAuth, { initAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/books',
      name: 'books',
      component: () => import('../views/BooksView.vue')
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchView.vue')
    },
    {
      path: '/book/detail/:id',
      name: 'book-detail',
      component: () => import('../views/BookDetailView.vue')
    },
    {
      path: '/book/add',
      name: 'add-book',
      component: () => import('../views/AddBookView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/book/edit/:id',
      name: 'edit-book',
      component: () => import('../views/EditBookView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/my/borrows',
      name: 'my-borrows',
      component: () => import('../views/MyBorrowsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/AdminUsersView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/admin/users/create',
      name: 'admin-user-create',
      component: () => import('../views/AdminUserCreateView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/admin/users/:id/edit',
      name: 'admin-user-edit',
      component: () => import('../views/AdminUserEditView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, hasRole, isInitialized } = useAuth()
  if (!isInitialized.value) {
    try {
      await initAuth()
    } catch (error) {
      console.error('Failed to initialize auth', error)
    }
  }

  if (to.meta?.guestOnly && isAuthenticated.value) {
    const redirectTarget = typeof to.query?.redirect === 'string' ? to.query.redirect : '/'
    return next(redirectTarget)
  }

  if (to.meta?.requiresAuth && !isAuthenticated.value) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (to.meta?.roles && to.meta.roles.length > 0 && !hasRole(to.meta.roles)) {
    return next({ name: 'home' })
  }

  return next()
})

export default router
