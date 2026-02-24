import { reactive, computed } from 'vue';
import AuthService from '../services/AuthService';
import { getToken, setToken, clearToken } from '../utils/authStorage';

const state = reactive({
  user: null,
  token: getToken(),
  loading: false,
  initialized: false,
  error: null
});

let initPromise = null;

const setSession = (token, user) => {
  state.token = token || null;
  state.user = user || null;
  if (token) {
    setToken(token);
  } else {
    clearToken();
  }
};

export const initAuth = async () => {
  if (state.initialized) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const storedToken = getToken();
    if (!storedToken) {
      state.initialized = true;
      return;
    }
    state.token = storedToken;
    state.loading = true;
    try {
      const { data } = await AuthService.getProfile();
      setSession(storedToken, data.user || data);
    } catch (error) {
      setSession(null, null);
    } finally {
      state.loading = false;
      state.initialized = true;
    }
  })();
  return initPromise;
};

const login = async (credentials) => {
  state.loading = true;
  state.error = null;
  try {
    const { data } = await AuthService.login(credentials);
    setSession(data.token, data.user);
    return data;
  } catch (error) {
    state.error = error.response?.data?.message || 'Unable to sign in. Please try again.';
    throw error;
  } finally {
    state.loading = false;
  }
};

const logout = () => {
  setSession(null, null);
};

const fetchProfile = async () => {
  if (!state.token) {
    return null;
  }
  try {
    const { data } = await AuthService.getProfile();
    state.user = data.user || data;
    return state.user;
  } catch (error) {
    setSession(null, null);
    throw error;
  }
};

const isAuthenticated = computed(() => Boolean(state.token && state.user));
const userRole = computed(() => state.user?.role || null);
const isInitialized = computed(() => state.initialized);

const hasRole = (roles) => {
  if (!roles) {
    return false;
  }
  const roleList = Array.isArray(roles) ? roles : [roles];
  return roleList.includes(state.user?.role);
};

if (typeof window !== 'undefined') {
  window.addEventListener('auth-token-expired', () => {
    setSession(null, null);
  });
}

export default function useAuth() {
  return {
    state,
    user: computed(() => state.user),
    token: computed(() => state.token),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    isAuthenticated,
    userRole,
    isInitialized,
    hasRole,
    login,
    logout,
    fetchProfile
  };
}
