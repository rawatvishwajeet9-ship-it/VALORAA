/**
 * VALORA Healthcare Management Platform - Patient Portal Logic
 */

// Load Patient Dashboard
async function loadPatientDashboard() {
  try {
    const res = await api.get('/patient/dashboard');
    if (!res.success) return;

    // 1. Stats Cards
    const stats = res.stats || {};
    const statRecords = document.getElementById('stat-records');
    const statConsults = document.getElementById('stat-consultations');
    const statRx = document.getElementById('stat-prescriptions');
    const statVitals = document.getElementById('stat-vitals-status');

    if (statRecords) statRecords.textContent = stats.medical_records || 0;
    if (statConsults) statConsults.textContent = stats.consultations || 0;
    if (statRx) statRx.textContent = stats.prescriptions || 0;

    const consultsSub = document.getElementById('stat-consults-sub');
    if (consultsSub) {
      consultsSub.textContent = `${stats.appointments || 0} upcoming scheduled`;
    }

    // 2. Patient Profile & Vitals Snapshot
    const vitals = res.vitals || {};
    const user = getCurrentUser();

    const nameEl = document.getElementById('dash-patient-name');
    if (nameEl && user && user.name) nameEl.textContent = user.name;

    const healthIdEl = document.getElementById('dash-health-id');
    if (healthIdEl) {
      healthIdEl.textContent = `PAT-${String(user?.id || 1).padStart(5, '0')}`;
    }

    const bloodGroupEl = document.getElementById('dash-blood-group');
    if (bloodGroupEl) {
      bloodGroupEl.textContent = vitals.blood_group || 'Unknown';
    }

    if (statVitals) {
      statVitals.textContent = (vitals.blood_pressure) ? vitals.blood_pressure.replace(' mmHg', '') : '120/80';
    }

    const allergiesSnapshot = document.getElementById('snapshot-allergies');
    if (allergiesSnapshot) {
      const list = vitals.allergies || [];
      allergiesSnapshot.textContent = list.length ? list.join(', ') : 'None reported';
    }

    const chronicSnapshot = document.getElementById('snapshot-chronic');
    if (chronicSnapshot) {
      const list = vitals.chronic_conditions || [];
      chronicSnapshot.textContent = list.length ? list.join(', ') : 'No chronic illnesses';
    }

    const emergencySnapshot = document.getElementById('snapshot-emergency');
    if (emergencySnapshot) {
      emergencySnapshot.textContent = (vitals.emergency_contact_name) 
        ? `${vitals.emergency_contact_name} (${vitals.emergency_contact_phone || ''})`
        : 'Not configured';
    }

    // 3. Latest Doctor Note Card
    const latestNoteBody = document.getElementById('latest-note-body');
    const latestNoteDate = document.getElementById('latest-note-date');
    if (latestNoteBody && res.latest_consultation) {
      const c = res.latest_consultation;
      if (latestNoteDate) latestNoteDate.textContent = formatDate(c.consultation_date);
      latestNoteBody.innerHTML = `
        <div style="font-size:0.75rem;color:#99f6e4;margin-bottom:2px;">Diagnosis:</div>
        <div style="font-size:1.25rem;font-weight:800;color:#ffffff;margin-bottom:8px;text-transform:capitalize;">${escapeHtml(c.diagnosis)}</div>
        <div style="font-size:0.85rem;color:#ccfbf1;display:flex;align-items:center;gap:6px;">
          <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
          By ${escapeHtml(c.doctor_name || 'Attending Physician')}
        </div>
      `;
    }

    // 4. Upcoming Scheduled Visits List
    const upcomingContainer = document.getElementById('patient-upcoming-visits-list');
    if (upcomingContainer) {
      const appts = res.upcoming_appointments || [];
      const linkCount = document.getElementById('link-upcoming-count');
      if (linkCount) linkCount.textContent = `View All (${appts.length}) \u2192`;

      if (appts.length === 0) {
        upcomingContainer.innerHTML = `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:0.9rem;">No upcoming appointments. <a href="/patient/doctors.html" style="color:#0d9488;font-weight:600;">Book a doctor now &rarr;</a></div>`;
      } else {
        upcomingContainer.innerHTML = appts.map(a => {
          const d = new Date(a.appointment_date);
          const dayNum = isNaN(d.getTime()) ? '20' : d.getDate();

          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid #f1f5f9;background:#ffffff;border-radius:10px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:40px;height:40px;border-radius:10px;background:#e6f7f5;color:#0d9488;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.05rem;">
                  ${dayNum}
                </div>
                <div>
                  <div style="font-weight:700;font-size:0.92rem;color:#0f172a;">${escapeHtml(a.doctor_name)}</div>
                  <div style="font-size:0.78rem;color:#64748b;">${formatDate(a.appointment_date)} &bull; ${escapeHtml(a.time_slot)}</div>
                </div>
              </div>
              <div style="text-align:right;">
                ${getStatusBadge(a.status)}
                <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">${escapeHtml(a.type || 'In-Person')}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Recent Records List
    const recordsContainer = document.getElementById('patient-recent-records-list');
    if (recordsContainer) {
      const records = res.recent_records || [];
      if (records.length === 0) {
        recordsContainer.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8;font-size:0.9rem;">No medical documents uploaded yet.</div>`;
      } else {
        recordsContainer.innerHTML = records.map(r => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:8px;background:#e6f7f5;color:#0d9488;display:flex;align-items:center;justify-content:center;">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <div style="font-weight:700;font-size:0.88rem;color:#0f172a;">${escapeHtml(r.title)}</div>
                <div style="font-size:0.75rem;color:#64748b;">${formatDate(r.record_date || r.created_at)} &bull; ${escapeHtml(r.record_type.replace('_', ' '))}</div>
              </div>
            </div>
            <a href="${r.file_url}" target="_blank" class="btn btn-secondary btn-sm" style="padding:4px 10px;font-size:0.78rem;">View</a>
          </div>
        `).join('');
      }
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Patient Appointments List
async function loadPatientAppointments(statusFilter = '') {
  const container = document.getElementById('patient-appts-list');
  if (!container) return;

  try {
    const res = await api.get('/appointments', { status: statusFilter });
    if (!res.success) return;

    if (!res.appointments || res.appointments.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:#94a3b8;font-size:0.92rem;">No appointments found under current filter. <a href="/patient/doctors.html" style="color:#0d9488;font-weight:600;">Book an appointment &rarr;</a></div>`;
      return;
    }

    container.innerHTML = res.appointments.map(a => {
      const d = new Date(a.appointment_date);
      const monthStr = isNaN(d.getTime()) ? 'DATE' : d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const dayNum = isNaN(d.getTime()) ? '--' : d.getDate();

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:#ffffff;border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);flex-wrap:wrap;gap:16px;">
          <div style="display:flex;align-items:center;gap:18px;">
            <div style="width:52px;height:52px;border-radius:12px;background:#e6f7f5;color:#0d9488;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;flex-shrink:0;">
              <span style="font-size:0.65rem;font-weight:800;letter-spacing:0.04em;">${monthStr}</span>
              <span style="font-size:1.25rem;font-weight:900;">${dayNum}</span>
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:1.05rem;font-weight:800;color:#0f172a;">${escapeHtml(a.doctor_name)}</span>
                ${getStatusBadge(a.status)}
              </div>
              <div style="font-size:0.82rem;color:#64748b;margin:4px 0;">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${escapeHtml(a.time_slot)} &bull; ${escapeHtml(a.type)} &bull; Fee: ${formatCurrency(a.consultation_fee || 500)}
              </div>
              <div style="font-size:0.8rem;color:#334155;background:#f8fafc;padding:4px 10px;border-radius:6px;display:inline-block;border:1px solid #f1f5f9;">
                <strong>Reason:</strong> ${escapeHtml(a.reason || 'General Health Checkup')}
              </div>
            </div>
          </div>

          <div>
            ${a.status !== 'completed' && a.status !== 'cancelled' ? `
              <button class="btn btn-sm" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;" onclick="cancelAppointment(${a.id})">
                Cancel
              </button>
            ` : a.status === 'completed' ? `
              <div style="display:flex;align-items:center;gap:8px;">
                ${a.review ? `
                  <span style="font-size:0.8rem;font-weight:700;color:#b45309;background:#fef3c7;padding:5px 10px;border-radius:8px;border:1px solid #fde68a;display:inline-flex;align-items:center;gap:5px;">
                    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Rated ${a.review.rating}/5
                  </span>
                  <button class="btn btn-sm" style="background:#f8fafc;color:#475569;border:1px solid #cbd5e1;padding:5px 9px;border-radius:6px;font-size:0.75rem;font-weight:600;" onclick="openReviewModal(${a.id}, ${a.doctor_id}, '${escapeHtml(a.doctor_name)}', ${a.review.rating}, '${escapeHtml(a.review.comment || '')}')">
                    Edit Review
                  </button>
                ` : `
                  <button class="btn btn-sm" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:700;padding:6px 14px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.04);" onclick="openReviewModal(${a.id}, ${a.doctor_id}, '${escapeHtml(a.doctor_name)}')">
                    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Rate Doctor
                  </button>
                `}
              </div>
            ` : `
              <span style="font-size:0.82rem;color:#94a3b8;font-weight:600;">${escapeHtml(a.status)}</span>
            `}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Cancel Appointment
async function cancelAppointment(apptId) {
  if (!confirm('Are you sure you want to cancel this scheduled consultation?')) return;
  try {
    const res = await api.patch(`/appointments/${apptId}/status`, {
      status: 'cancelled',
      notes: 'Cancelled by patient'
    });
    if (res.success) {
      showToast('Appointment successfully cancelled.', 'info');
      if (document.getElementById('patient-appts-list')) loadPatientAppointments();
      else loadPatientDashboard();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Rate & Review Doctor Handlers (Patient only for completed appointments)
function openReviewModal(appointmentId, doctorId, doctorName, currentRating = 5, currentComment = '') {
  const modal = document.getElementById('modal-review-doctor');
  if (!modal) return;

  document.getElementById('review-appointment-id').value = appointmentId;
  const subtitle = document.getElementById('review-modal-subtitle');
  if (subtitle) {
    subtitle.textContent = `Consultation with Dr. ${doctorName} (Completed)`;
  }

  setRatingStars(currentRating);
  const commentInput = document.getElementById('review-comment-input');
  if (commentInput) {
    commentInput.value = currentComment || '';
  }

  modal.style.display = 'flex';
}
window.openReviewModal = openReviewModal;

function closeReviewModal() {
  const modal = document.getElementById('modal-review-doctor');
  if (modal) modal.style.display = 'none';
}
window.closeReviewModal = closeReviewModal;

const ratingLabels = {
  1: '1.0 Star (Poor)',
  2: '2.0 Stars (Fair)',
  3: '3.0 Stars (Good)',
  4: '4.0 Stars (Very Good)',
  5: '5.0 Stars (Excellent)'
};

function setRatingStars(val) {
  val = parseInt(val) || 5;
  document.getElementById('review-rating-value').value = val;
  const label = document.getElementById('rating-text-label');
  if (label) {
    label.textContent = ratingLabels[val] || `${val}.0 Stars`;
  }

  const buttons = document.querySelectorAll('#star-rating-container .star-rating-btn');
  buttons.forEach(btn => {
    const starVal = parseInt(btn.getAttribute('data-value'));
    const svg = btn.querySelector('svg');
    if (starVal <= val) {
      svg.setAttribute('fill', '#f59e0b');
      svg.setAttribute('stroke', '#d97706');
    } else {
      svg.setAttribute('fill', '#e2e8f0');
      svg.setAttribute('stroke', '#cbd5e1');
    }
  });
}
window.setRatingStars = setRatingStars;

async function handleReviewSubmit(e) {
  e.preventDefault();
  const appointmentId = document.getElementById('review-appointment-id').value;
  const rating = document.getElementById('review-rating-value').value;
  const comment = document.getElementById('review-comment-input').value.trim();

  if (!appointmentId) {
    showToast('Invalid appointment selected.', 'error');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-review');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    const res = await api.post('/reviews', {
      appointment_id: parseInt(appointmentId),
      rating: parseInt(rating),
      comment: comment
    });

    if (res.success) {
      showToast(res.message || 'Review submitted successfully!', 'success');
      closeReviewModal();
      if (document.getElementById('patient-appts-list')) {
        loadPatientAppointments();
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to submit review.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  }
}
window.handleReviewSubmit = handleReviewSubmit;

// Load Doctors Directory
// Load Doctors Directory with DSA Indexing
let doctorsCache = [];
let doctorIndex = null;
let doctorTrie = null;

function buildDoctorsDSAIndex(doctors) {
  if (typeof InvertedIndex !== 'undefined') {
    doctorIndex = new InvertedIndex();
    doctorTrie = new Trie();
    doctors.forEach(d => {
      doctorIndex.addRecord(d.id, [
        d.name,
        d.specialty,
        d.clinic_city,
        d.clinic_name,
        (d.qualifications || []).join(' '),
        d.biography || ''
      ], d);
      doctorTrie.insert(d.name, d.id);
      doctorTrie.insert(d.specialty, d.id);
    });
  }
}

async function loadDoctorsDirectory() {
  const container = document.getElementById('doctors-directory-grid');
  if (!container) return;

  try {
    const res = await api.get('/doctors', { _t: Date.now() });
    if (!res.success) return;

    doctorsCache = res.doctors || [];
    buildDoctorsDSAIndex(doctorsCache);
    renderDoctorsDirectory(doctorsCache);

    const searchInput = document.getElementById('doc-search-query');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterDoctorsList();
      });
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderDoctorsDirectory(doctors) {
  const container = document.getElementById('doctors-directory-grid');
  if (!container) return;

  if (doctors.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:#94a3b8;font-size:0.92rem;">No verified specialists matching your criteria.</div>`;
    return;
  }

  container.innerHTML = doctors.map(d => {
    const initial = (d.name || 'D')[0].toUpperCase();
    const quals = (d.qualifications || []).join(', ') || 'MBBS';
    const avatarHtml = (d.avatar && (d.avatar.startsWith('data:image') || d.avatar.startsWith('http') || d.avatar.startsWith('/')))
      ? `<img src="${d.avatar}" alt="${escapeHtml(d.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
      : `<span style="font-weight:800;font-size:1.15rem;color:#0d9488;">${initial}</span>`;

    return `
      <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;border-radius:14px;padding:22px;">
        <div>
          <!-- Top Row: Avatar + Name + Practitioner Badge -->
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:48px;height:48px;border-radius:12px;background:#e6f7f5;color:#0d9488;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px solid #99f6e4;">
                ${avatarHtml}
              </div>
              <div>
                <div style="font-weight:800;font-size:1.05rem;color:#0f172a;">${escapeHtml(d.name)}</div>
                <div style="font-size:0.82rem;font-weight:600;color:#0d9488;">${escapeHtml(d.specialty)}</div>
              </div>
            </div>
            <span class="badge" style="background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;font-size:0.72rem;padding:3px 8px;">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
              Practitioner
            </span>
          </div>

          <!-- Rating & Experience -->
          <div style="font-size:0.8rem;color:#64748b;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#f59e0b;font-weight:700;">&#9733; ${d.rating || 4.8}${d.total_reviews ? ` (${d.total_reviews})` : ''}</span>
            &bull;
            <span>${d.experience_years || 2}+ yrs exp</span>
            &bull;
            <span>${escapeHtml(quals)}</span>
          </div>

          <!-- Facility & Hours -->
          <div style="font-size:0.82rem;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(d.clinic_name || 'VALORA Care Center')}, ${escapeHtml(d.clinic_city || 'City')}
          </div>
          <div style="font-size:0.82rem;color:#475569;margin-bottom:18px;display:flex;align-items:center;gap:6px;">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${d.start_time || '09:00'} - ${d.end_time || '17:00'}
          </div>
        </div>

        <!-- Bottom: Consultation Fee + Book Slot Button -->
        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:14px;">
          <div>
            <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;letter-spacing:0.04em;">CONSULTATION</div>
            <div style="font-size:1.15rem;font-weight:800;color:#0f172a;">${formatCurrency(d.consultation_fee || 500)}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openBookingModal(${d.user_id}, '${escapeHtml(d.name)}', '${escapeHtml(d.specialty)}', ${d.consultation_fee || 500})">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="white"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Book Slot
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filterDoctorsList() {
  const q = document.getElementById('doc-search-query')?.value.trim() || '';
  const spec = document.getElementById('doc-filter-specialty')?.value.trim() || '';

  let candidates = doctorsCache;
  if (q && doctorIndex) {
    candidates = doctorIndex.search(q, false);
  } else if (q) {
    const qLower = q.toLowerCase();
    candidates = doctorsCache.filter(d =>
      (d.name || '').toLowerCase().includes(qLower) ||
      (d.clinic_city || '').toLowerCase().includes(qLower) ||
      (d.clinic_name || '').toLowerCase().includes(qLower)
    );
  }

  if (spec) {
    candidates = candidates.filter(d => (d.specialty || '').toLowerCase() === spec.toLowerCase());
  }

  renderDoctorsDirectory(candidates);
}

// Open Booking Modal
async function openBookingModal(docUserId, docName, specialty, fee) {
  const docIdInput = document.getElementById('book-doc-id');
  const docNameEl = document.getElementById('book-doc-name');
  const docSubEl = document.getElementById('book-doc-sub');

  if (docIdInput) docIdInput.value = docUserId;
  if (docNameEl) docNameEl.textContent = docName;
  if (docSubEl) docSubEl.textContent = `${specialty} • Fee: ${formatCurrency(fee)}`;

  const dateInput = document.getElementById('book-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    if (!dateInput.value) dateInput.value = today;
    dateInput.min = today;
  }

  openModal('modal-book-appointment');
  await refreshBookedSlots();
}

async function refreshBookedSlots() {
  const docId = document.getElementById('book-doc-id')?.value;
  const dateVal = document.getElementById('book-date')?.value;
  if (!docId || !dateVal) return;

  try {
    const res = await api.get('/appointments/booked-slots', { doctor_id: docId, date: dateVal });
    const booked = res.booked_slots || [];

    const pills = document.querySelectorAll('#modal-book-appointment .time-slot-pill');
    pills.forEach(pill => {
      const slot = pill.getAttribute('data-slot') || pill.textContent.replace(/\s*\(Booked\)/i, '').trim();
      if (booked.includes(slot)) {
        pill.classList.add('booked');
        pill.classList.remove('active');
        pill.setAttribute('title', 'This slot is already booked by another patient.');
        pill.innerHTML = `${escapeHtml(slot)} <span style="display:block;font-size:0.65rem;color:#f87171;font-weight:700;">(Booked)</span>`;
      } else {
        pill.classList.remove('booked');
        pill.removeAttribute('title');
        pill.innerHTML = escapeHtml(slot);
      }
    });

    const hiddenSlot = document.getElementById('book-time-slot');
    if (hiddenSlot && booked.includes(hiddenSlot.value)) {
      hiddenSlot.value = '';
    }
  } catch (err) {
    console.error('Error fetching booked slots:', err);
  }
}
window.refreshBookedSlots = refreshBookedSlots;

function selectTimeSlot(el, slot) {
  if (el.classList.contains('booked')) {
    showToast('This time slot is already booked by another patient and cannot be selected.', 'error');
    return;
  }
  document.querySelectorAll('#modal-book-appointment .time-slot-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const hidden = document.getElementById('book-time-slot');
  if (hidden) hidden.value = slot;
}
window.selectTimeSlot = selectTimeSlot;

// Handle Book Appointment Form Submission
async function handleBookAppointment(e) {
  e.preventDefault();
  const doctor_id = parseInt(document.getElementById('book-doc-id').value);
  const appointment_date = document.getElementById('book-date').value;
  const time_slot = document.getElementById('book-time-slot').value;
  const type = document.getElementById('book-type').value;
  const reason = document.getElementById('book-reason').value.trim();

  if (!doctor_id || !appointment_date || !time_slot) {
    showToast('Please select date and time slot for your appointment.', 'error');
    return;
  }

  try {
    const res = await api.post('/appointments', {
      doctor_id,
      appointment_date,
      time_slot,
      type,
      reason: reason || 'General health consultation'
    });

    if (res.success) {
      closeModal('modal-book-appointment');
      showToast('Appointment successfully scheduled!', 'success');
      setTimeout(() => {
        window.location.href = '/patient/appointments.html';
      }, 800);
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Patient Medical Records Vault
async function loadPatientRecords(typeFilter = '') {
  const container = document.getElementById('patient-records-container');
  if (!container) return;

  try {
    const res = await api.get('/records', { type: typeFilter });
    if (!res.success) return;

    const records = res.records || [];
    if (records.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding:60px 20px;text-align:center;">
          <div style="width:58px;height:58px;border-radius:16px;background:#e6f7f5;color:#0d9488;margin:0 auto 16px auto;display:flex;align-items:center;justify-content:center;">
            <svg class="svg-icon svg-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h3 style="font-size:1.15rem;font-weight:800;color:#0f172a;margin-bottom:6px;">No medical records found</h3>
          <p style="font-size:0.86rem;color:#64748b;max-width:420px;margin:0 auto 20px auto;">Upload laboratory reports, scans, or X-rays to your encrypted vault.</p>
          <button type="button" class="btn btn-primary" onclick="openModal('modal-upload-record')">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload First Document
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Document Details</th>
                <th>Category</th>
                <th>Facility</th>
                <th>Recorded Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td>
                    <div style="font-weight:700;color:#0f172a;">${escapeHtml(r.title)}</div>
                    <div style="font-size:0.78rem;color:#64748b;">${escapeHtml(r.file_name || 'document.pdf')} &bull; ${(r.file_size ? (r.file_size/1024).toFixed(1) + ' KB' : 'PDF')}</div>
                  </td>
                  <td>
                    <span class="badge" style="background:#e6f7f5;color:#0d9488;">${escapeHtml(r.record_type.replace('_', ' '))}</span>
                  </td>
                  <td>${escapeHtml(r.facility_name || 'VALORA Health Diagnostics')}</td>
                  <td>${formatDate(r.record_date || r.created_at)}</td>
                  <td>
                    <a href="${r.file_url}" target="_blank" class="btn btn-primary btn-sm">Inspect</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Patient Health Profile
async function loadPatientProfile() {
  try {
    const res = await api.get('/patient/profile');
    if (!res.success || !res.profile) return;

    const p = res.profile;
    document.getElementById('name').value = p.name || '';
    document.getElementById('email').value = p.email || '';
    
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.value = p.phone || '';
      updatePatientPhoneBadge(phoneInput.value);
    }

    document.getElementById('blood_group').value = p.blood_group || 'Unknown';
    document.getElementById('gender').value = p.gender || 'prefer_not_to_say';
    document.getElementById('date_of_birth').value = p.date_of_birth || '';
    document.getElementById('height_cm').value = p.height_cm || '';
    document.getElementById('weight_kg').value = p.weight_kg || '';
    document.getElementById('allergies').value = (p.allergies || []).join(', ');
    document.getElementById('chronic_conditions').value = (p.chronic_conditions || []).join(', ');

    const emName = document.getElementById('emergency_contact_name');
    if (emName) emName.value = p.emergency_contact_name || '';

    const emPhone = document.getElementById('emergency_contact_phone');
    if (emPhone) emPhone.value = p.emergency_contact_phone || '';

    const ins = document.getElementById('insurance_provider');
    if (ins) ins.value = p.insurance_provider || '';

    const insPolicy = document.getElementById('insurance_policy_number');
    if (insPolicy) insPolicy.value = p.insurance_policy_number || '';

    const street = document.getElementById('street');
    if (street) street.value = p.street || '';
    const city = document.getElementById('city');
    if (city) city.value = p.city || '';
    const state = document.getElementById('state');
    if (state) state.value = p.state || '';
    const zip = document.getElementById('postal_code');
    if (zip) zip.value = p.postal_code || '';

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Save Patient Profile with Strict Validation
async function savePatientProfile(e) {
  e.preventDefault();

  const phoneRaw = document.getElementById('phone').value.replace(/[^0-9]/g, '');
  if (phoneRaw.length < 9 || phoneRaw.length > 11) {
    showToast('Phone number must contain between 9 and 11 digits.', 'error');
    return;
  }

  const dobVal = document.getElementById('date_of_birth').value;
  if (dobVal) {
    const yr = parseInt(dobVal.split('-')[0], 10);
    if (yr > 2022 || yr < 1900) {
      showToast('Year of birth must be between 1900 and 2022.', 'error');
      return;
    }
  }

  const heightVal = document.getElementById('height_cm').value;
  if (heightVal) {
    const h = parseFloat(heightVal);
    if (isNaN(h) || h < 30 || h > 280) {
      showToast('Height must be between 30 cm and 280 cm.', 'error');
      return;
    }
  }

  const weightVal = document.getElementById('weight_kg').value;
  if (weightVal) {
    const w = parseFloat(weightVal);
    if (isNaN(w) || w < 2 || w > 400) {
      showToast('Weight must be between 2 kg and 400 kg.', 'error');
      return;
    }
  }

  const emPhoneInput = document.getElementById('emergency_contact_phone');
  let emPhoneCleaned = '';
  if (emPhoneInput && emPhoneInput.value) {
    emPhoneCleaned = emPhoneInput.value.replace(/[^0-9]/g, '');
    if (emPhoneCleaned.length < 9 || emPhoneCleaned.length > 11) {
      showToast('Emergency contact phone must contain between 9 and 11 digits.', 'error');
      return;
    }
  }

  const allergiesRaw = document.getElementById('allergies').value;
  const chronicRaw = document.getElementById('chronic_conditions').value;

  const data = {
    name: document.getElementById('name').value.trim(),
    phone: phoneRaw,
    blood_group: document.getElementById('blood_group').value,
    gender: document.getElementById('gender').value,
    date_of_birth: dobVal,
    height_cm: heightVal ? parseFloat(heightVal) : null,
    weight_kg: weightVal ? parseFloat(weightVal) : null,
    allergies: allergiesRaw.split(',').map(s => s.trim()).filter(Boolean),
    chronic_conditions: chronicRaw.split(',').map(s => s.trim()).filter(Boolean),
    emergency_contact_name: document.getElementById('emergency_contact_name')?.value.trim() || '',
    emergency_contact_phone: emPhoneCleaned,
    insurance_provider: document.getElementById('insurance_provider')?.value.trim() || '',
    insurance_policy_number: document.getElementById('insurance_policy_number')?.value.trim() || '',
    street: document.getElementById('street')?.value.trim() || '',
    city: document.getElementById('city')?.value.trim() || '',
    state: document.getElementById('state')?.value.trim() || '',
    postal_code: document.getElementById('postal_code')?.value.trim() || ''
  };

  try {
    const res = await api.put('/patient/profile', data);
    if (res.success) {
      showToast('Medical profile updated successfully!', 'success');
      const cur = getCurrentUser();
      if (cur) {
        cur.name = data.name;
        cur.phone = data.phone;
        setCurrentUser(cur);
      }
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Patient Prescriptions
async function loadPatientPrescriptions() {
  const container = document.getElementById('prescriptions-container');
  if (!container) return;

  try {
    const res = await api.get('/prescriptions');
    const prescriptions = res.prescriptions || [];

    if (prescriptions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="svg-icon svg-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
          </div>
          <h3>No Electronic Prescriptions</h3>
          <p>You do not have any prescriptions issued yet. Once your physician completes a consultation, your digital Rx will be securely archived here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = prescriptions.map((rx, idx) => {
      const rxDate = formatDate(rx.prescribed_date);
      const meds = rx.medications || [];
      const tests = rx.diagnostic_tests || [];

      return `
        <div class="card rx-card" style="margin-bottom:24px;border:1px solid #e2e8f0;box-shadow:var(--shadow-sm);border-radius:var(--radius-lg);overflow:hidden;">
          <!-- Rx Header -->
          <div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${(rx.doctor_avatar && (rx.doctor_avatar.startsWith('data:image') || rx.doctor_avatar.startsWith('http') || rx.doctor_avatar.startsWith('/'))) ? `
                <img src="${rx.doctor_avatar}" alt="Dr. ${escapeHtml(rx.doctor_name || 'Physician')}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid #99f6e4;flex-shrink:0;">
              ` : `
                <div style="width:40px;height:40px;border-radius:10px;background:#0d9488;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;flex-shrink:0;">
                  Rx
                </div>
              `}
              <div>
                <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin:0;">Dr. ${escapeHtml(rx.doctor_name || 'Physician')}</h4>
                <div style="font-size:0.8rem;color:var(--text-muted);">
                  ${escapeHtml(rx.doctor_specialty || 'General Practitioner')} • Lic #${escapeHtml(rx.license_number || 'N/A')}
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:#ecfdf5;color:#0d9488;border:1px solid #a7f3d0;font-weight:600;">Verified Digital Rx</span>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">Date: <strong>${rxDate}</strong></div>
            </div>
          </div>

          <!-- Rx Body -->
          <div style="padding:24px;">
            <h5 style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.05em;color:#0d9488;font-weight:700;margin-bottom:12px;">
              Prescribed Medications (${meds.length})
            </h5>
            <div style="overflow-x:auto;">
              <table class="data-table" style="width:100%;font-size:0.88rem;margin-bottom:20px;">
                <thead>
                  <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                    <th style="padding:8px 12px;text-align:left;">Medication Name</th>
                    <th style="padding:8px 12px;text-align:left;">Dosage</th>
                    <th style="padding:8px 12px;text-align:left;">Frequency</th>
                    <th style="padding:8px 12px;text-align:left;">Duration</th>
                    <th style="padding:8px 12px;text-align:left;">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${meds.map(m => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:10px 12px;font-weight:600;color:var(--text-main);">${escapeHtml(m.name || m.drug_name || '')}</td>
                      <td style="padding:10px 12px;color:#475569;">${escapeHtml(m.dosage || '-')}</td>
                      <td style="padding:10px 12px;color:#475569;">${escapeHtml(m.frequency || '-')}</td>
                      <td style="padding:10px 12px;color:#475569;">${escapeHtml(m.duration || '-')}</td>
                      <td style="padding:10px 12px;color:#64748b;font-size:0.82rem;">${escapeHtml(m.instructions || m.timing || 'After food')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            ${tests.length > 0 ? `
              <div style="margin-bottom:16px;">
                <h5 style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.05em;color:#0d9488;font-weight:700;margin-bottom:8px;">
                  Recommended Diagnostic Investigations
                </h5>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  ${tests.map(t => `<span class="badge" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:5px 10px;">${escapeHtml(typeof t === 'string' ? t : t.test_name)}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${rx.general_advice ? `
              <div style="background:#f8fafc;padding:12px 16px;border-left:3px solid #0d9488;border-radius:6px;margin-top:14px;">
                <strong style="font-size:0.85rem;color:var(--text-main);display:block;margin-bottom:4px;">Physician Clinical Advice:</strong>
                <p style="margin:0;font-size:0.85rem;color:#475569;line-height:1.5;">${escapeHtml(rx.general_advice)}</p>
              </div>
            ` : ''}

            <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #e2e8f0;padding-top:16px;" class="no-print">
              <span style="font-size:0.75rem;color:#94a3b8;">Digitally signed & encrypted via VALORA EHR</span>
              <button class="btn btn-secondary btn-sm" onclick="window.print()">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Print Prescription
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>Error Loading Prescriptions</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

// Load Patient Medical History
async function loadMedicalHistory() {
  const container = document.getElementById('history-timeline-container');
  if (!container) return;

  try {
    const res = await api.get('/patient/history');
    const timeline = res.timeline || [];

    if (timeline.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="svg-icon svg-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h3>No Consultation Records Found</h3>
          <p>You have not had any medical consultations logged in the system yet. Once you complete a visit with a doctor, the complete diagnostic history will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="position:relative;padding-left:32px;border-left:2px solid #ccfbf1;margin-left:12px;">
        ${timeline.map(item => {
          const dateStr = formatDate(item.consultation_date);
          const symptoms = item.symptoms || [];
          const rx = item.prescription;

          return `
            <div style="position:relative;margin-bottom:32px;">
              <!-- Timeline node circle -->
              <div style="position:absolute;left:-41px;top:0;width:18px;height:18px;border-radius:50%;background:#0d9488;border:3px solid #ffffff;box-shadow:0 0 0 2px #0d9488;"></div>
              
              <div class="card" style="box-shadow:var(--shadow-sm);border:1px solid #e2e8f0;border-radius:var(--radius-lg);padding:24px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                  <div>
                    <span style="font-size:0.8rem;color:#0d9488;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Consultation Record</span>
                    <h4 style="font-size:1.15rem;font-weight:700;color:var(--text-main);margin:4px 0;">Diagnosis: ${escapeHtml(item.diagnosis || 'General Checkup')}</h4>
                    <div style="font-size:0.85rem;color:var(--text-muted);">
                      Attending Physician: <strong>Dr. ${escapeHtml(item.doctor_name || 'Practitioner')}</strong> (${escapeHtml(item.specialty || 'General')})
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <span class="badge" style="background:#f8fafc;color:#475569;border:1px solid #e2e8f0;">${dateStr}</span>
                  </div>
                </div>

                <!-- Symptoms -->
                ${symptoms.length > 0 ? `
                  <div style="margin-bottom:14px;">
                    <strong style="font-size:0.82rem;color:var(--text-muted);display:block;margin-bottom:6px;">Reported Symptoms:</strong>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                      ${symptoms.map(s => `<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;">${escapeHtml(s)}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Recorded Vitals Box -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;margin-bottom:16px;">
                  <div>
                    <span style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:600;display:block;">Blood Pressure</span>
                    <strong style="font-size:0.95rem;color:var(--text-main);">${escapeHtml(item.blood_pressure || 'N/A')}</strong>
                  </div>
                  <div>
                    <span style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:600;display:block;">Heart Rate</span>
                    <strong style="font-size:0.95rem;color:var(--text-main);">${item.heart_rate ? item.heart_rate + ' bpm' : 'N/A'}</strong>
                  </div>
                  <div>
                    <span style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:600;display:block;">Temperature</span>
                    <strong style="font-size:0.95rem;color:var(--text-main);">${item.temperature_f ? item.temperature_f + ' °F' : 'N/A'}</strong>
                  </div>
                  <div>
                    <span style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:600;display:block;">SpO2 Oxygen</span>
                    <strong style="font-size:0.95rem;color:var(--text-main);">${item.oxygen_saturation ? item.oxygen_saturation + ' %' : 'N/A'}</strong>
                  </div>
                </div>

                <!-- Clinical Notes -->
                ${item.notes ? `
                  <div style="margin-bottom:14px;">
                    <strong style="font-size:0.82rem;color:var(--text-muted);display:block;margin-bottom:4px;">Doctor's Clinical Notes:</strong>
                    <p style="margin:0;font-size:0.88rem;color:#334155;line-height:1.5;">${escapeHtml(item.notes)}</p>
                  </div>
                ` : ''}

                <!-- Prescriptions issued in this visit -->
                ${rx && rx.medications && rx.medications.length > 0 ? `
                  <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-top:12px;">
                    <div style="font-size:0.82rem;font-weight:700;color:#0d9488;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                      <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                      Attached Prescription (${rx.medications.length} items)
                    </div>
                    <ul style="margin:0;padding-left:18px;font-size:0.82rem;color:#065f46;">
                      ${rx.medications.map(m => `<li><strong>${escapeHtml(m.name || m.drug_name)}</strong> – ${escapeHtml(m.dosage || '')} (${escapeHtml(m.frequency || '')})</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>Error Loading Medical History</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}
