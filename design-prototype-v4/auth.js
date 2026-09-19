// auth.js — Auth state management for Madarasati V4
// Session-based authentication using HttpOnly cookies.

const authState = {
  loading: true,
  currentUser: null,
  error: null,
  initialized: false,
};

function isAdmin() {
  return authState.currentUser && authState.currentUser.role === 'admin';
}

function isOwner() {
  return authState.currentUser && authState.currentUser.role === 'owner';
}

function isTeacher() {
  return authState.currentUser && authState.currentUser.role === 'teacher';
}

function isClient() {
  return authState.currentUser && authState.currentUser.role === 'client';
}

function isLoggedIn() {
  return !!authState.currentUser;
}

function getCurrentUser() {
  return authState.currentUser;
}

async function checkSession() {
  authState.loading = true;
  authState.error = null;
  try {
    const session = await apiGet('/api/auth/session');
    if (session && session.hasSession) {
      const user = await apiGet('/api/auth/me');
      authState.currentUser = user;
    } else {
      authState.currentUser = null;
    }
  } catch (e) {
    authState.currentUser = null;
    if (e.status && e.status !== 401) {
      authState.error = e.message;
    }
  } finally {
    authState.loading = false;
    authState.initialized = true;
  }
}

async function loginUser(email, password) {
  authState.loading = true;
  authState.error = null;
  try {
    const user = await apiPost('/api/auth/login', { email: email, password: password });
    authState.currentUser = user;
    return user;
  } catch (e) {
    authState.currentUser = null;
    authState.error = (e.data && e.data.error) || e.message || 'Login failed';
    throw e;
  } finally {
    authState.loading = false;
  }
}

async function logoutUser() {
  try {
    await apiPost('/api/auth/logout');
  } catch (e) {
    // ignore logout errors
  }
  authState.currentUser = null;
  authState.error = null;
  try { localStorage.removeItem('v4return'); } catch (e) {}
}

function getLoginRedirect(user) {
  if (!user) return 'home';
  if (user.role === 'admin') return 'admin';
  if (user.role === 'owner') return 'owner';
  return 'home';
}

function canAccessRoute(route, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (route === 'admin' || route === 'schools' || route === 'access' || route === 'settings') return false;
  return true;
}

const ADMIN_ROUTES = ['admin', 'schools', 'access', 'settings'];
