/**
 * VALORA Healthcare Management Platform - Authentication & Guard Service
 */

// Universal Password Visibility Toggle
function togglePasswordVisibility(target, btnEl) {
  let input = null;
  if (typeof target === 'string') {
    input = document.getElementById(target);
  } else if (target && target.tagName === 'INPUT') {
    input = target;
  }

  if (!input && btnEl) {
    const wrapper = btnEl.closest('.password-input-wrapper, .input-with-icon-wrapper, .form-group');
    if (wrapper) {
      input = wrapper.querySelector('input[type="password"], input[type="text"]');
    }
  }

  if (!input) return;

  const currentType = input.getAttribute('type') || input.type;
  const willShow = currentType === 'password';

  input.setAttribute('type', willShow ? 'text' : 'password');
  input.type = willShow ? 'text' : 'password';

  if (btnEl) {
    const eyeSvg = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeOffSvg = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

    btnEl.innerHTML = willShow ? eyeOffSvg : eyeSvg;
    btnEl.setAttribute('title', willShow ? 'Hide password' : 'Show password');
    btnEl.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
  }

  input.focus();
}
window.togglePasswordVisibility = togglePasswordVisibility;

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
