/**
 * VALORA Healthcare Management Platform - Authentication & Guard Service
 */

// Route Guard - Run on page load
function checkAuth(requiredRole = null) {
  const user = getCurrentUser();

  if (!user) {
    // If on a protected page, redirect to login
    const path = window.location.pathname;
    if (path.includes('/patient/') || path.includes('/doctor/') || path.includes('/admin/')) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return null;
  }

  // If specific role required and user does not match
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    showToast(`Access restricted. This portal is for ${requiredRole}s only.`, 'error');
    setTimeout(() => {
      if (user.role === 'patient') window.location.href = '/patient/dashboard.html';
      else if (user.role === 'doctor') window.location.href = '/doctor/dashboard.html';
      else window.location.href = '/admin/dashboard.html';
    }, 1500);
    return false;
  }

  return user;
}

// Perform Login
async function handleLogin(email, password, remember = true) {
  try {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.user) {
      setCurrentUser(res.user, remember);
      showToast(res.message || 'Login successful!', 'success');

      // Redirect according to role
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');

        if (redirect && !redirect.includes('login') && !redirect.includes('register')) {
          window.location.href = redirect;
          return;
        }

        if (res.user.role === 'patient') {
          window.location.href = '/patient/dashboard.html';
        } else if (res.user.role === 'doctor') {
          window.location.href = '/doctor/dashboard.html';
        } else if (res.user.role === 'admin') {
          window.location.href = '/admin/dashboard.html';
        } else {
          window.location.href = '/';
        }
      }, 600);
      return res.user;
    }
  } catch (error) {
    showToast(error.message || 'Login failed. Please verify your email and password.', 'error');
    throw error;
  }
}

// Perform Registration
async function handleRegister(userData) {
  try {
    const res = await api.post('/auth/register', userData);
    if (res.success && res.user) {
      showToast(res.message || 'Account registered successfully! Please sign in.', 'success');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1200);
      return res.user;
    }
  } catch (error) {
    showToast(error.message || 'Registration failed.', 'error');
    throw error;
  }
}

// Perform Logout
async function handleLogout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // Ignore server error on logout
  } finally {
    clearCurrentUser();
    window.location.href = '/login.html';
  }
}
