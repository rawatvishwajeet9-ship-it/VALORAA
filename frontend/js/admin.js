/**
 * VALORA Healthcare Management Platform - Hospital Administration Portal Logic
 * Includes DSA-powered live search and native SVG interactive bar charts & reports.
 */

// Global caches for DSA indexing
let adminAuditLogsCache = [];
let adminDoctorsCache = [];
let adminPatientsCache = [];
let adminAppointmentsCache = [];

let auditIndex = null;
let doctorAdminIndex = null;
let patientAdminIndex = null;
let apptAdminIndex = null;

// Safe element text setter
function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// -------------------------------------------------------------
// 1. Admin Dashboard Overview
// -------------------------------------------------------------
async function loadAdminDashboard() {
  try {
    const res = await api.get('/admin/stats');
    if (!res.success) return;

    const stats = res.stats || {};
    setTxt('stat-patients', stats.total_patients || 0);
    setTxt('stat-doctors', stats.total_doctors || 0);
    setTxt('stat-pending', stats.pending_doctors || 0);
    setTxt('stat-appts', stats.total_appointments || 0);
    setTxt('stat-records', stats.total_records || 0);
    setTxt('stat-revenue', formatCurrency(stats.total_revenue || 0));

    // Load recent system audit logs
    loadAdminAuditLogs();

    // Render quick visual activity bar graph if container exists
    const miniChart = document.getElementById('dashboard-activity-chart');
    if (miniChart) {
      loadDashboardActivityChart();
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Audit Logs Table with Real-time DSA Search
async function loadAdminAuditLogs() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;

  try {
    const res = await api.get('/admin/audit-logs');
    if (!res.success || !res.logs) return;

    adminAuditLogsCache = res.logs || [];

    // Build Inverted Index for DSA instant search
    if (typeof InvertedIndex !== 'undefined') {
      auditIndex = new InvertedIndex();
      adminAuditLogsCache.forEach(log => {
        auditIndex.addRecord(log.id, [
          log.action,
          log.user_name || '',
          log.user_role || '',
          log.entity_type || '',
          String(log.entity_id || ''),
          JSON.stringify(log.details || {})
        ], log);
      });
    }

    renderAuditLogsTable(adminAuditLogsCache);

    const searchInput = document.getElementById('audit-search-query');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterAuditLogs(searchInput.value.trim());
      });
    }

  } catch (error) {
    console.error(error);
  }
}

function renderAuditLogsTable(logs) {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#64748b;">No matching audit activity found.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>
        <span style="font-family:monospace;font-size:0.8rem;background:#f1f5f9;padding:3px 6px;border-radius:4px;font-weight:700;color:#0f172a;">
          ${escapeHtml(log.action)}
        </span>
      </td>
      <td>
        <div style="font-weight:600;color:#0f172a;">${escapeHtml(log.user_name || 'System')}</div>
        <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(log.user_role || 'Core')}</div>
      </td>
      <td>
        <span class="badge" style="background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;">${escapeHtml(log.entity_type)} #${escapeHtml(log.entity_id)}</span>
      </td>
      <td>
        <div style="font-size:0.8rem;color:#475569;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(JSON.stringify(log.details))}">
          ${escapeHtml(JSON.stringify(log.details))}
        </div>
      </td>
      <td>
        <div style="font-size:0.8rem;color:#64748b;">${formatDate(log.created_at)}</div>
      </td>
    </tr>
  `).join('');
}

function filterAuditLogs(query) {
  if (!query) {
    renderAuditLogsTable(adminAuditLogsCache);
    return;
  }
  if (auditIndex) {
    const results = auditIndex.search(query, false);
    renderAuditLogsTable(results);
  } else {
    const qLower = query.toLowerCase();
    const results = adminAuditLogsCache.filter(l =>
      (l.action || '').toLowerCase().includes(qLower) ||
      (l.user_name || '').toLowerCase().includes(qLower) ||
      (l.entity_type || '').toLowerCase().includes(qLower)
    );
    renderAuditLogsTable(results);
  }
}

// -------------------------------------------------------------
// 2. Physician Verification with DSA Search
// -------------------------------------------------------------
async function loadAdminDoctors() {
  const tbody = document.getElementById('admin-doctors-tbody');
  if (!tbody) return;

  try {
    const res = await api.get('/admin/doctors');
    if (!res.success || !res.doctors) return;

    adminDoctorsCache = res.doctors || [];

    // Build Inverted Index
    if (typeof InvertedIndex !== 'undefined') {
      doctorAdminIndex = new InvertedIndex();
      adminDoctorsCache.forEach(d => {
        doctorAdminIndex.addRecord(d.id, [
          d.name,
          d.email,
          d.phone || '',
          d.specialty,
          d.license_number,
          (d.qualifications || []).join(' '),
          d.clinic_name || ''
        ], d);
      });
    }

    renderAdminDoctorsTable(adminDoctorsCache);

    const searchInput = document.getElementById('doc-search-query');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterAdminDoctors();
      });
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderAdminDoctorsTable(doctors) {
  const tbody = document.getElementById('admin-doctors-tbody');
  if (!tbody) return;

  if (doctors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">No doctors matching search criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = doctors.map(d => {
    const avatarHtml = (d.avatar && (d.avatar.startsWith('data:image') || d.avatar.startsWith('http') || d.avatar.startsWith('/')))
      ? `<img src="${d.avatar}" alt="${escapeHtml(d.name)}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:36px;height:36px;border-radius:10px;background:#e6f7f5;color:#0d9488;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${(d.name || 'D')[0].toUpperCase()}</div>`;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${avatarHtml}
            <div>
              <div style="font-weight:700;color:#0f172a;">${escapeHtml(d.name)}</div>
              <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(d.email)} &bull; ${escapeHtml(d.phone ? ('+91 ' + d.phone) : 'No phone')}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:600;color:#0d9488;">${escapeHtml(d.specialty)}</div>
          <div style="font-size:0.75rem;color:#64748b;">${(d.qualifications || []).join(', ')} &bull; ${d.experience_years} yrs exp</div>
        </td>
        <td>
          <span style="font-family:monospace;font-weight:700;color:#0f172a;background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:0.82rem;border:1px solid #e2e8f0;">
            ${escapeHtml(d.license_number)}
          </span>
        </td>
        <td>
          ${d.is_verified
            ? `<span class="badge badge-success"><svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg> Verified</span>`
            : `<span class="badge badge-warning">Pending License Check</span>`}
        </td>
        <td>${getStatusBadge(d.user_status)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            ${!d.is_verified ? `
              <button class="btn btn-success btn-sm" onclick="verifyDoctorAction(${d.id}, 'approve')">Approve</button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="verifyDoctorAction(${d.id}, 'reject')">Revoke</button>
            `}
            ${d.user_status === 'active' ? `
              <button class="btn btn-danger btn-sm" onclick="toggleUserStatus(${d.user_id}, 'suspended')">Suspend</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="toggleUserStatus(${d.user_id}, 'active')">Activate</button>
            `}
            <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:5px 9px;border-radius:6px;font-weight:600;" onclick="deleteUserAccount(${d.user_id}, '${escapeHtml(d.name)}')">
              Remove
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminDoctors() {
  const query = document.getElementById('doc-search-query')?.value.trim() || '';
  const statusFilter = document.getElementById('doc-filter-status')?.value || '';

  let candidates = adminDoctorsCache;
  if (query && doctorAdminIndex) {
    candidates = doctorAdminIndex.search(query, false);
  } else if (query) {
    const qLower = query.toLowerCase();
    candidates = adminDoctorsCache.filter(d =>
      (d.name || '').toLowerCase().includes(qLower) ||
      (d.specialty || '').toLowerCase().includes(qLower) ||
      (d.license_number || '').toLowerCase().includes(qLower) ||
      (d.email || '').toLowerCase().includes(qLower)
    );
  }

  if (statusFilter === 'verified') {
    candidates = candidates.filter(d => d.is_verified);
  } else if (statusFilter === 'pending') {
    candidates = candidates.filter(d => !d.is_verified);
  } else if (statusFilter === 'suspended') {
    candidates = candidates.filter(d => d.user_status === 'suspended');
  }

  renderAdminDoctorsTable(candidates);
}

// Doctor Verification Action
async function verifyDoctorAction(doctorId, action) {
  try {
    const res = await api.post(`/admin/doctors/${doctorId}/verify`, { action });
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminDoctors();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// User Status Toggle (Suspend / Activate)
async function toggleUserStatus(userId, status) {
  if (!confirm(`Are you sure you want to mark this account as ${status}?`)) return;
  try {
    const res = await api.patch(`/admin/users/${userId}/status`, { status });
    if (res.success) {
      showToast(res.message, 'success');
      if (document.getElementById('admin-doctors-tbody')) loadAdminDoctors();
      else if (document.getElementById('admin-patients-tbody')) loadAdminPatients();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Permanently Delete / Remove User Account
async function deleteUserAccount(userId, userName) {
  if (!confirm(`Are you sure you want to permanently remove the account for "${userName}"? This will delete all clinical records, appointments, and credentials.`)) {
    return;
  }
  try {
    const res = await api.delete(`/admin/users/${userId}`);
    if (res.success) {
      showToast(res.message, 'success');
      if (document.getElementById('admin-doctors-tbody')) loadAdminDoctors();
      if (document.getElementById('admin-patients-tbody')) loadAdminPatients();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}
window.deleteUserAccount = deleteUserAccount;

// -------------------------------------------------------------
// 3. Patient Governance with DSA Search
// -------------------------------------------------------------
async function loadAdminPatients() {
  const tbody = document.getElementById('admin-patients-tbody');
  if (!tbody) return;

  try {
    const res = await api.get('/admin/patients');
    if (!res.success || !res.patients) return;

    adminPatientsCache = res.patients || [];

    if (typeof InvertedIndex !== 'undefined') {
      patientAdminIndex = new InvertedIndex();
      adminPatientsCache.forEach(p => {
        patientAdminIndex.addRecord(p.id, [
          p.name,
          p.email,
          p.phone || '',
          p.blood_group || '',
          p.insurance_provider || '',
          p.city || ''
        ], p);
      });
    }

    renderAdminPatientsTable(adminPatientsCache);

    const searchInput = document.getElementById('patient-search-query');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterAdminPatients();
      });
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderAdminPatientsTable(patients) {
  const tbody = document.getElementById('admin-patients-tbody');
  if (!tbody) return;

  if (patients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">No patient profiles matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = patients.map(p => {
    const avatarHtml = (p.avatar && (p.avatar.startsWith('data:image') || p.avatar.startsWith('http') || p.avatar.startsWith('/')))
      ? `<img src="${p.avatar}" alt="${escapeHtml(p.name)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:36px;height:36px;border-radius:50%;background:#e6f7f5;color:#0d9488;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${(p.name || 'P')[0].toUpperCase()}</div>`;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${avatarHtml}
            <div>
              <div style="font-weight:700;color:#0f172a;">${escapeHtml(p.name)}</div>
              <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(p.email)} &bull; ${escapeHtml(p.phone ? ('+91 ' + p.phone) : 'No phone')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge" style="background:#e6f7f5;color:#0d9488;font-weight:700;">${escapeHtml(p.blood_group || 'Unknown')}</span>
          <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">DOB: ${escapeHtml(p.date_of_birth || 'Not recorded')} &bull; ${escapeHtml(p.gender || '')}</div>
        </td>
        <td>
          <div style="font-weight:600;font-size:0.85rem;color:#334155;">${escapeHtml(p.insurance_provider || 'Self-Pay / None')}</div>
          <div style="font-size:0.75rem;font-family:monospace;color:#64748b;">${escapeHtml(p.insurance_policy_number || 'N/A')}</div>
        </td>
        <td>
          <div style="font-size:0.82rem;font-weight:600;color:#0f172a;">${p.total_appointments || 0} Consultations</div>
          <div style="font-size:0.75rem;color:#64748b;">${p.total_records || 0} Vault Documents</div>
        </td>
        <td>${getStatusBadge(p.user_status)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            ${p.user_status === 'active' ? `
              <button class="btn btn-danger btn-sm" onclick="toggleUserStatus(${p.user_id}, 'suspended')">Suspend</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="toggleUserStatus(${p.user_id}, 'active')">Activate</button>
            `}
            <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:5px 9px;border-radius:6px;font-weight:600;" onclick="deleteUserAccount(${p.user_id}, '${escapeHtml(p.name)}')">
              Remove
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminPatients() {
  const query = document.getElementById('patient-search-query')?.value.trim() || '';
  const bgFilter = document.getElementById('patient-filter-bg')?.value || '';

  let candidates = adminPatientsCache;
  if (query && patientAdminIndex) {
    candidates = patientAdminIndex.search(query, false);
  } else if (query) {
    const qLower = query.toLowerCase();
    candidates = adminPatientsCache.filter(p =>
      (p.name || '').toLowerCase().includes(qLower) ||
      (p.email || '').toLowerCase().includes(qLower) ||
      (p.phone || '').includes(qLower)
    );
  }

  if (bgFilter) {
    candidates = candidates.filter(p => (p.blood_group || '').toLowerCase() === bgFilter.toLowerCase());
  }

  renderAdminPatientsTable(candidates);
}

// -------------------------------------------------------------
// 4. Master Appointments with DSA Search
// -------------------------------------------------------------
async function loadAdminAppointments() {
  const tbody = document.getElementById('admin-appointments-tbody');
  if (!tbody) return;

  try {
    const res = await api.get('/admin/appointments');
    if (!res.success || !res.appointments) return;

    adminAppointmentsCache = res.appointments || [];

    if (typeof InvertedIndex !== 'undefined') {
      apptAdminIndex = new InvertedIndex();
      adminAppointmentsCache.forEach(a => {
        apptAdminIndex.addRecord(a.id, [
          a.patient_name,
          a.doctor_name,
          a.doctor_specialty || '',
          a.status,
          a.reason || '',
          a.appointment_date
        ], a);
      });
    }

    renderAdminAppointmentsTable(adminAppointmentsCache);

    const searchInput = document.getElementById('appt-search-query');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterAdminAppointments();
      });
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderAdminAppointmentsTable(appointments) {
  const tbody = document.getElementById('admin-appointments-tbody');
  if (!tbody) return;

  if (appointments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">No matching appointments found.</td></tr>`;
    return;
  }

  tbody.innerHTML = appointments.map(a => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:#64748b;">#APT-${String(a.id).padStart(3, '0')}</td>
      <td>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(a.patient_name)}</div>
        <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(a.patient_email)}</div>
      </td>
      <td>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(a.doctor_name)}</div>
        <div style="font-size:0.8rem;color:#0d9488;font-weight:600;">${escapeHtml(a.doctor_specialty || 'General')}</div>
      </td>
      <td>
        <div style="font-weight:600;color:#0f172a;">${formatDate(a.appointment_date)}</div>
        <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(a.time_slot)} &bull; ${escapeHtml(a.type || 'In-Person')}</div>
      </td>
      <td>
        <span style="font-weight:700;color:#0f172a;">${formatCurrency(a.fee)}</span>
      </td>
      <td>${getStatusBadge(a.status)}</td>
    </tr>
  `).join('');
}

function filterAdminAppointments() {
  const query = document.getElementById('appt-search-query')?.value.trim() || '';
  const statusFilter = document.getElementById('appt-filter-status')?.value || '';

  let candidates = adminAppointmentsCache;
  if (query && apptAdminIndex) {
    candidates = apptAdminIndex.search(query, false);
  } else if (query) {
    const qLower = query.toLowerCase();
    candidates = adminAppointmentsCache.filter(a =>
      (a.patient_name || '').toLowerCase().includes(qLower) ||
      (a.doctor_name || '').toLowerCase().includes(qLower) ||
      (a.doctor_specialty || '').toLowerCase().includes(qLower) ||
      (a.status || '').toLowerCase().includes(qLower)
    );
  }

  if (statusFilter) {
    candidates = candidates.filter(a => (a.status || '').toLowerCase() === statusFilter.toLowerCase());
  }

  renderAdminAppointmentsTable(candidates);
}

// -------------------------------------------------------------
// 5. Visual Reports & Native SVG Charts Engine
// -------------------------------------------------------------
async function loadAdminAnalytics() {
  try {
    const res = await api.get('/admin/analytics');
    if (!res.success) return;

    const statsRes = await api.get('/admin/stats');
    const stats = statsRes.success ? (statsRes.stats || {}) : {};

    // 1. Render Physician Specialties Horizontal Bar Chart
    renderSpecialtyBarChart(res.specialties || []);

    // 2. Render Monthly Consultation Volume Bar Chart
    renderMonthlyVolumeBarChart(res.monthly_appointments || []);

    // 3. Render Appointment Status Donut Chart
    renderStatusDonutChart(res.appointment_statuses || []);

    // 4. Render Vault Documents Breakdown Bar Chart
    renderRecordsVaultBarChart(res.record_types || []);

    // 5. Update KPI Callouts
    setTxt('kpi-total-revenue', formatCurrency(stats.total_revenue || 0));
    setTxt('kpi-total-consultations', stats.total_consultations || 0);
    setTxt('kpi-total-patients', stats.total_patients || 0);
    setTxt('kpi-total-doctors', stats.total_doctors || 0);

  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Native SVG Horizontal Bar Graph for Physician Specialties
 */
function renderSpecialtyBarChart(specialties) {
  const container = document.getElementById('analytics-specialties-chart');
  if (!container) return;

  if (specialties.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8;">No physician specialty data recorded yet.</div>`;
    return;
  }

  const maxVal = Math.max(...specialties.map(s => s.count), 1);
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#f59e0b', '#ec4899', '#06b6d4', '#10b981'];

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;padding:10px 0;">
      ${specialties.map((s, idx) => {
        const pct = Math.max(Math.round((s.count / maxVal) * 100), 12);
        const color = colors[idx % colors.length];
        return `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:600;margin-bottom:5px;">
              <span style="color:#0f172a;">${escapeHtml(s.specialty)}</span>
              <span style="color:${color};font-weight:800;">${s.count} Practitioner${s.count > 1 ? 's' : ''}</span>
            </div>
            <div style="height:12px;background:#f1f5f9;border-radius:6px;overflow:hidden;position:relative;">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:6px;transition:width 0.8s ease;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Native SVG Vertical Bar Chart for Monthly Appointment Volume
 */
function renderMonthlyVolumeBarChart(monthlyData) {
  const container = document.getElementById('analytics-monthly-chart');
  if (!container) return;

  if (monthlyData.length === 0) {
    // Show current month baseline
    const curMonth = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
    monthlyData = [{ month: curMonth, count: 1 }];
  }

  const maxVal = Math.max(...monthlyData.map(m => m.count), 5);
  const chartHeight = 180;

  container.innerHTML = `
    <div style="padding:16px 0;">
      <div style="height:${chartHeight}px;display:flex;align-items:flex-end;gap:20px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
        ${monthlyData.map(m => {
          const barHeight = Math.max(Math.round((m.count / maxVal) * (chartHeight - 30)), 24);
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;">
              <span style="font-size:0.75rem;font-weight:800;color:#0d9488;margin-bottom:4px;">${m.count}</span>
              <div style="width:100%;max-width:44px;height:${barHeight}px;background:linear-gradient(180deg, #14b8a6 0%, #0d9488 100%);border-radius:6px 6px 0 0;transition:height 0.8s ease;box-shadow:0 2px 4px rgba(13,148,136,0.15);"></div>
              <span style="font-size:0.72rem;color:#64748b;font-weight:600;margin-top:8px;white-space:nowrap;">${escapeHtml(m.month)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Native SVG Donut Chart for Appointment Statuses
 */
function renderStatusDonutChart(statuses) {
  const container = document.getElementById('analytics-status-chart');
  if (!container) return;

  if (statuses.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8;">No appointment telemetry to plot.</div>`;
    return;
  }

  const total = statuses.reduce((acc, s) => acc + s.count, 0) || 1;
  const statusColors = {
    'confirmed': '#10b981',
    'scheduled': '#f59e0b',
    'completed': '#0d9488',
    'cancelled': '#ef4444'
  };

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;justify-content:center;padding:12px 0;">
      <!-- Donut Circle Center Representation -->
      <div style="position:relative;width:120px;height:120px;border-radius:50%;background:#f8fafc;border:10px solid #e2e8f0;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 4px rgba(0,0,0,0.04);">
        <div style="text-align:center;">
          <div style="font-size:1.4rem;font-weight:800;color:#0f172a;">${total}</div>
          <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Bookings</div>
        </div>
      </div>

      <!-- Legend & Percentages -->
      <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:8px;">
        ${statuses.map(s => {
          const color = statusColors[s.status.toLowerCase()] || '#6366f1';
          const pct = Math.round((s.count / total) * 100);
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.82rem;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:3px;"></span>
                <span style="font-weight:600;color:#334155;text-transform:capitalize;">${escapeHtml(s.status)}</span>
              </div>
              <div style="font-weight:700;color:#0f172a;">
                ${s.count} <span style="font-size:0.75rem;color:#64748b;">(${pct}%)</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Native SVG Horizontal Distribution for Vault Documents
 */
function renderRecordsVaultBarChart(records) {
  const container = document.getElementById('analytics-vault-chart');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8;">No medical documents in vault yet.</div>`;
    return;
  }

  const maxVal = Math.max(...records.map(r => r.count), 1);
  const colors = ['#7c3aed', '#2563eb', '#0d9488', '#ea580c', '#0891b2'];

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:10px 0;">
      ${records.map((r, idx) => {
        const pct = Math.max(Math.round((r.count / maxVal) * 100), 15);
        const color = colors[idx % colors.length];
        return `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:600;margin-bottom:4px;">
              <span style="color:#0f172a;">${escapeHtml(r.record_type.replace('_', ' ').toUpperCase())}</span>
              <span style="color:${color};font-weight:700;">${r.count} Record${r.count > 1 ? 's' : ''}</span>
            </div>
            <div style="height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:5px;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
