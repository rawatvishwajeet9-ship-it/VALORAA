/**
 * VALORA Healthcare Management Platform - Common Layout & UI Helpers
 */

// SVG Icon Definitions
const ICONS = {
  eye: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
  check: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>`,
  calendar: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  user: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  stethoscope: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  pill: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  folder: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  clock: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  shield: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  logout: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
  // Populate user profile info in sidebars and topbars if available
  const user = getCurrentUser();
  if (user) {
    document.querySelectorAll('.current-user-name').forEach(el => {
      el.textContent = user.name || 'User';
    });
    document.querySelectorAll('.current-user-role').forEach(el => {
      el.textContent = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : '';
    });
    document.querySelectorAll('.current-user-email').forEach(el => {
      el.textContent = user.email || '';
    });
    document.querySelectorAll('.current-user-avatar').forEach(el => {
      const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      el.textContent = initials;
    });
  }

  // Highlight active link in sidebar
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath.endsWith(href) || currentPath.includes(href.replace('.html', '')))) {
      link.classList.add('active');
    }
  });

  // Attach modal close events
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  // Attach auto phone validation to all tel inputs on page
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    bindPhoneInputValidation(input);
  });

  // Attach auto DOB validation to all date inputs with dob id/name
  document.querySelectorAll('input[type="date"][id*="dob"], input[type="date"][name*="dob"]').forEach(input => {
    bindDateOfBirthValidation(input);
  });
});

// Toggle Password Visibility with Eye Icon
function togglePasswordVisibility(fieldId, btnEl) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btnEl.innerHTML = ICONS.eyeOff;
    btnEl.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btnEl.innerHTML = ICONS.eye;
    btnEl.setAttribute('aria-label', 'Show password');
  }
}

// Phone Number Validation: strictly digits 0-9, between 9 and 11 digits
function bindPhoneInputValidation(input) {
  if (!input) return;
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('pattern', '[0-9]{9,11}');
  input.setAttribute('maxlength', '11');

  // Prevent typing any non-numeric character at keystroke level
  input.addEventListener('keydown', (e) => {
    // Allowed control & navigation keys
    const allowedKeys = ['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;
    // Allow Ctrl/Command shortcuts (A, C, V, X)
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;

    // Reject anything that is not 0-9
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    // Strip everything except digits immediately
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 11);
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
    const digitsOnly = pasteData.replace(/[^0-9]/g, '').slice(0, 11);
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentVal = input.value;
    const nextVal = (currentVal.slice(0, start) + digitsOnly + currentVal.slice(end)).replace(/[^0-9]/g, '').slice(0, 11);
    input.value = nextVal;
  });
}

function isValidPhone(phoneStr) {
  if (!phoneStr) return true; // optional unless required
  const digits = String(phoneStr).replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 11;
}

// Date of Birth Validation: year cannot be more than 2022 or less than 1900
function bindDateOfBirthValidation(input) {
  if (!input) return;
  input.setAttribute('max', '2022-12-31');
  input.setAttribute('min', '1900-01-01');

  input.addEventListener('change', () => {
    validateDateOfBirth(input);
  });
}

function validateDateOfBirth(input) {
  if (!input || !input.value) return true;
  const val = input.value;
  const parts = val.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    if (year > 2022 || year < 1900) {
      input.setCustomValidity('Year of birth must be between 1900 and 2022.');
      input.classList.add('is-invalid');
      return false;
    }
  }
  input.setCustomValidity('');
  input.classList.remove('is-invalid');
  return true;
}

// Height & Weight Validation
function isValidHeight(h) {
  if (h === null || h === undefined || h === '') return true;
  const val = parseFloat(h);
  return !isNaN(val) && val >= 30 && val <= 280;
}

function isValidWeight(w) {
  if (w === null || w === undefined || w === '') return true;
  const val = parseFloat(w);
  return !isNaN(val) && val >= 2 && val <= 400;
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Formatters
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'confirmed':
    case 'completed':
    case 'active':
    case 'verified':
      return `<span class="badge badge-success">${ICONS.check} ${status}</span>`;
    case 'scheduled':
    case 'pending':
    case 'pending_verification':
      return `<span class="badge badge-warning">${status.replace('_', ' ')}</span>`;
    case 'cancelled':
    case 'suspended':
    case 'rejected':
      return `<span class="badge badge-danger">${status}</span>`;
    default:
      return `<span class="badge badge-neutral">${status}</span>`;
  }
}
