/**
 * VALORA Healthcare Management Platform - Common Layout & UI Helpers
 */

// SVG Icon Definitions (Strictly Zero Emojis)
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
  // 1. Populate current user info in header and sidebar
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
    updateUserAvatarDisplay(user.avatar, user.name);
  }

  // 2. Highlight active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath.endsWith(href) || currentPath.includes(href.replace('.html', '')))) {
      link.classList.add('active');
    }
  });

  // 3. Modal dismiss handlers
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // 4. Initialize CAPTCHA if display element is present
  if (document.getElementById('captcha-display')) {
    refreshCaptcha();
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  // 4. Attach auto phone validation to all tel inputs on page
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    bindPhoneInputValidation(input);
  });

  // 5. Attach auto DOB validation to all date inputs
  document.querySelectorAll('input[type="date"][id*="dob"], input[type="date"][id*="birth"]').forEach(input => {
    bindDateOfBirthValidation(input);
  });

  // 6. Attach Height validation
  document.querySelectorAll('input[id*="height"]').forEach(input => {
    bindHeightInputValidation(input);
  });

  // 7. Attach Weight validation
  document.querySelectorAll('input[id*="weight"]').forEach(input => {
    bindWeightInputValidation(input);
  });
});

/**
 * Toggle Custom Specialty Field when "Other" is selected
 */
function toggleCustomSpecialty(selectEl, customContainerId, customInputId) {
  const container = document.getElementById(customContainerId);
  const input = customInputId ? document.getElementById(customInputId) : (container ? container.querySelector('input') : null);
  if (!container) return;
  if (selectEl.value === 'Other') {
    container.style.display = 'block';
    if (input) {
      input.setAttribute('required', 'required');
      input.focus();
    }
  } else {
    container.style.display = 'none';
    if (input) {
      input.removeAttribute('required');
      input.value = '';
    }
  }
}
window.toggleCustomSpecialty = toggleCustomSpecialty;

/**
 * Render Avatar Image or Initials dynamically in any container
 */
function updateUserAvatarDisplay(avatarUrl, userName) {
  const user = getCurrentUser();
  const name = userName || (user ? user.name : 'U');
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  document.querySelectorAll('.current-user-avatar').forEach(el => {
    if (avatarUrl && (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) {
      el.innerHTML = `<img src="${avatarUrl}" alt="${escapeHtml(name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
    } else {
      el.textContent = initials;
    }
  });
}

/**
 * Handle Native Image File Upload for both Patient and Doctor Profiles
 */
function handleNativeAvatarFile(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    showToast('Please select a valid image file (PNG, JPG, or WEBP).', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size cannot exceed 5MB.', 'error');
    return;
  }

  showToast('Uploading profile image...', 'info');

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result;
    
    // Update local UI immediately
    updateUserAvatarDisplay(dataUrl);

    try {
      const res = await api.post('/auth/avatar', { avatar: dataUrl });
      if (res.success) {
        const user = getCurrentUser();
        if (user) {
          user.avatar = dataUrl;
          setCurrentUser(user);
        }
        showToast('Profile photo updated successfully!', 'success');
      } else {
        showToast(res.message || 'Failed to update avatar.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error updating avatar.', 'error');
    }
  };
  reader.readAsDataURL(file);
}
window.handleNativeAvatarFile = handleNativeAvatarFile;

function triggerAvatarUpload(fileInputId) {
  let fileInput = document.getElementById(fileInputId);
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = fileInputId;
    fileInput.accept = 'image/png, image/jpeg, image/jpg, image/webp';
    fileInput.style.display = 'none';
    fileInput.onchange = function() { handleNativeAvatarFile(this); };
    document.body.appendChild(fileInput);
  }
  fileInput.click();
}
window.triggerAvatarUpload = triggerAvatarUpload;

/**
 * Native Document Vault Upload Handlers
 */
function updateSelectedFileName(input) {
  const display = document.getElementById('selected-file-display') || (input.parentElement && input.parentElement.querySelector('#selected-file-display'));
  if (!display) return;
  if (input.files && input.files.length > 0) {
    if (input.files.length === 1) {
      const f = input.files[0];
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
      display.innerHTML = `<span style="color:#0d9488;font-weight:700;">Selected:</span> ${escapeHtml(f.name)} (${sizeMb} MB)`;
    } else {
      const names = Array.from(input.files).map(f => escapeHtml(f.name)).join(', ');
      display.innerHTML = `<span style="color:#0d9488;font-weight:700;">Selected ${input.files.length} reports / images:</span> ${names}`;
    }
  } else {
    display.textContent = '';
  }
}
window.updateSelectedFileName = updateSelectedFileName;

async function handlePatientUploadRecord(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('rec-file-input');
  const title = (document.getElementById('rec-title')?.value || '').trim();
  const record_type = document.getElementById('rec-type')?.value || 'lab_report';
  const facility = (document.getElementById('rec-facility')?.value || 'VALORA Health Diagnostics').trim();
  const tags = (document.getElementById('rec-tags')?.value || '').trim();
  const desc = (document.getElementById('rec-summary')?.value || '').trim();

  if (!title) {
    showToast('Please enter a record title.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('record_type', record_type);
  formData.append('facility_or_doctor', facility);
  formData.append('tags', tags);
  formData.append('description', desc);

  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('files', fileInput.files[i]);
    }
    formData.append('file', fileInput.files[0]);
  }

  try {
    showToast('Securing document in encrypted vault...', 'info');
    const res = await api.post('/records', formData);
    if (res.success) {
      showToast(res.message || 'Medical record stored securely in vault!', 'success');
      closeModal('modal-upload-record');
      
      const form = document.getElementById('upload-record-form');
      if (form) form.reset();
      const display = document.getElementById('selected-file-display');
      if (display) display.textContent = '';

      if (typeof loadPatientRecords === 'function') {
        loadPatientRecords();
      }
      if (typeof loadPatientDashboard === 'function') {
        loadPatientDashboard();
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to upload document.', 'error');
  }
}
window.handlePatientUploadRecord = handlePatientUploadRecord;

async function handleDoctorUploadRecord(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('rec-file-input');
  const patientId = document.getElementById('upload-target-patient-id')?.value;
  const title = (document.getElementById('rec-title')?.value || '').trim();
  const record_type = document.getElementById('rec-type')?.value || 'lab_report';
  const facility = (document.getElementById('rec-facility')?.value || 'VALORA Care Center').trim();
  const tags = (document.getElementById('rec-tags')?.value || '').trim();
  const desc = (document.getElementById('rec-summary')?.value || '').trim();

  if (!title) {
    showToast('Please enter a record title.', 'error');
    return;
  }

  const formData = new FormData();
  if (patientId) formData.append('patient_id', patientId);
  formData.append('title', title);
  formData.append('record_type', record_type);
  formData.append('facility_or_doctor', facility);
  formData.append('tags', tags);
  formData.append('description', desc);

  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('files', fileInput.files[i]);
    }
    formData.append('file', fileInput.files[0]);
  }

  try {
    showToast('Uploading clinical document to patient vault...', 'info');
    const res = await api.post('/records', formData);
    if (res.success) {
      showToast(res.message || 'Document uploaded successfully to patient vault!', 'success');
      closeModal('modal-upload-record');
      const form = document.getElementById('upload-record-form');
      if (form) form.reset();
      const display = document.getElementById('selected-file-display');
      if (display) display.textContent = '';
      if (typeof loadDoctorPatients === 'function') {
        loadDoctorPatients();
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to upload document.', 'error');
  }
}
window.handleDoctorUploadRecord = handleDoctorUploadRecord;

/**
 * Strictly Numeric Keystroke & Input Blocker for Phone Numbers
 * Completely prevents any letter, word, or symbol from ever being typed or pasted.
 */
function bindPhoneInputValidation(input, badgeId) {
  if (!input) return;
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('pattern', '[0-9]{9,11}');
  input.setAttribute('maxlength', '11');

  // 1. Block non-numeric keystrokes at keydown
  input.addEventListener('keydown', (e) => {
    const allowedControls = ['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedControls.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // 2. Block non-numeric characters before they reach the DOM
  input.addEventListener('beforeinput', (e) => {
    if (e.data && /[^0-9]/.test(e.data)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // 3. Immediately strip any non-digit character on input
  input.addEventListener('input', () => {
    const original = input.value;
    const cleaned = original.replace(/[^0-9]/g, '').slice(0, 11);
    if (original !== cleaned) {
      input.value = cleaned;
    }
    updatePhoneBadgeUI(input, badgeId);
  });

  // 4. Intercept paste to clean non-digits
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
    const digitsOnly = pasteData.replace(/[^0-9]/g, '').slice(0, 11);
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentVal = input.value;
    const nextVal = (currentVal.slice(0, start) + digitsOnly + currentVal.slice(end)).replace(/[^0-9]/g, '').slice(0, 11);
    input.value = nextVal;
    updatePhoneBadgeUI(input, badgeId);
  });

  // 5. Blur validation check
  input.addEventListener('blur', () => {
    const val = input.value.trim();
    if (!val && !input.required) return;
    if (val.length < 9 || val.length > 11) {
      input.style.borderColor = '#ef4444';
    } else {
      input.style.borderColor = '#10b981';
    }
  });
}

function updatePhoneBadgeUI(input, badgeId) {
  const badge = badgeId ? document.getElementById(badgeId) : input.parentElement.querySelector('.phone-digit-tag');
  if (!badge) return;
  const digits = input.value.replace(/[^0-9]/g, '');
  if (digits.length >= 9 && digits.length <= 11) {
    badge.innerHTML = `<span style="color:#059669;font-weight:700;font-size:0.75rem;">&check; ${digits.length}d</span>`;
    input.style.borderColor = '#10b981';
  } else if (digits.length === 0) {
    badge.innerHTML = `<span style="color:#94a3b8;font-size:0.75rem;">0/10d</span>`;
    input.style.borderColor = '';
  } else {
    badge.innerHTML = `<span style="color:#dc2626;font-size:0.75rem;">${digits.length}/10d</span>`;
    input.style.borderColor = '#ef4444';
  }
}

/**
 * Strict Keystroke Blocker for Height (30 cm - 250 cm)
 */
function bindHeightInputValidation(input) {
  if (!input) return;
  input.setAttribute('inputmode', 'decimal');
  input.setAttribute('min', '30');
  input.setAttribute('max', '250');

  input.addEventListener('keydown', (e) => {
    const allowed = ['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;

    if (e.key === '.' && !input.value.includes('.')) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
  });

  input.addEventListener('blur', () => {
    if (!input.value) return;
    const h = parseFloat(input.value);
    if (isNaN(h) || h < 30 || h > 250) {
      input.style.borderColor = '#ef4444';
      showToast('Realistic human height must be between 30 cm and 250 cm.', 'error');
    } else {
      input.style.borderColor = '#10b981';
    }
  });
}

/**
 * Strict Keystroke Blocker for Weight (2 kg - 300 kg)
 */
function bindWeightInputValidation(input) {
  if (!input) return;
  input.setAttribute('inputmode', 'decimal');
  input.setAttribute('min', '2');
  input.setAttribute('max', '300');

  input.addEventListener('keydown', (e) => {
    const allowed = ['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;

    if (e.key === '.' && !input.value.includes('.')) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
  });

  input.addEventListener('blur', () => {
    if (!input.value) return;
    const w = parseFloat(input.value);
    if (isNaN(w) || w < 2 || w > 300) {
      input.style.borderColor = '#ef4444';
      showToast('Realistic human weight must be between 2 kg and 300 kg.', 'error');
    } else {
      input.style.borderColor = '#10b981';
    }
  });
}

/**
 * Date of Birth Validation (1900-01-01 to Today, Newborns Born Today Allowed)
 */
function bindDateOfBirthValidation(input) {
  if (!input) return;
  const todayStr = new Date().toISOString().split('T')[0];
  input.setAttribute('max', todayStr);
  input.setAttribute('min', '1900-01-01');

  const check = () => {
    if (!input.value) return true;
    const currentToday = new Date().toISOString().split('T')[0];
    if (input.value > currentToday) {
      input.setCustomValidity('Date of birth cannot be in the future.');
      input.style.borderColor = '#ef4444';
      showToast('Date of birth cannot be in the future (up to today allowed for newborns).', 'error');
      return false;
    }
    const parts = input.value.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      if (year < 1900) {
        input.setCustomValidity('Year of birth must be 1900 or later.');
        input.style.borderColor = '#ef4444';
        showToast('Year of birth must be 1900 or later.', 'error');
        return false;
      }
    }
    input.setCustomValidity('');
    input.style.borderColor = '#10b981';
    return true;
  };

  input.addEventListener('change', check);
  input.addEventListener('blur', check);
}

function isValidPhone(phoneStr) {
  if (!phoneStr) return true;
  const digits = String(phoneStr).replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 11;
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
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

// -------------------------------------------------------------
// Interactive Security CAPTCHA & Profile Password Management
// -------------------------------------------------------------
let currentCaptchaSecret = '';

function generateCaptchaCode(len = 5) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function refreshCaptcha() {
  const display = document.getElementById('captcha-display');
  if (!display) return;
  currentCaptchaSecret = generateCaptchaCode(5);
  display.textContent = currentCaptchaSecret;
  const input = document.getElementById('captcha_input');
  if (input) input.value = '';
}
window.refreshCaptcha = refreshCaptcha;

async function handleProfileChangePassword(e) {
  e.preventDefault();
  const curPw = document.getElementById('current_password').value;
  const newPw = document.getElementById('new_password').value.trim();
  const confirmPw = document.getElementById('confirm_password').value.trim();
  const captchaIn = (document.getElementById('captcha_input')?.value || '').trim().toUpperCase();

  if (!curPw || !newPw || !confirmPw) {
    showToast('Please fill all password fields.', 'error');
    return;
  }

  if (newPw.length < 6) {
    showToast('New password must be at least 6 characters.', 'error');
    return;
  }

  if (newPw !== confirmPw) {
    showToast('New password and confirmation do not match.', 'error');
    return;
  }

  if (!captchaIn || captchaIn !== currentCaptchaSecret.toUpperCase()) {
    showToast('Security CAPTCHA verification failed. Please enter the correct code.', 'error');
    refreshCaptcha();
    return;
  }

  const btn = document.getElementById('btn-change-pw-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  try {
    const res = await api.post('/auth/change-password', {
      current_password: curPw,
      new_password: newPw,
      captcha_code: captchaIn,
      captcha_expected: currentCaptchaSecret
    });

    if (res.success) {
      showToast(res.message || 'Password changed successfully!', 'success');
      document.getElementById('form-change-password').reset();
      refreshCaptcha();
    }
  } catch (error) {
    showToast(error.message || 'Failed to update password.', 'error');
    refreshCaptcha();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Change Password';
    }
  }
}
window.handleProfileChangePassword = handleProfileChangePassword;
