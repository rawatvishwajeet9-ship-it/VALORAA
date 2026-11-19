/**
 * VALORA Healthcare Management Platform - Hospital Administration Portal Logic
 */

// Load Admin Dashboard
async function loadAdminDashboard() {
  try {
    const res = await api.get('/admin/stats');
    if (!res.success) return;

    const stats = res.stats || {};
    document.getElementById('stat-patients').textContent = stats.total_patients || 0;
    document.getElementById('stat-doctors').textContent = stats.total_doctors || 0;
    document.getElementById('stat-pending').textContent = stats.pending_doctors || 0;
    document.getElementById('stat-appts').textContent = stats.total_appointments || 0;
    document.getElementById('stat-records').textContent = stats.total_records || 0;
    document.getElementById('stat-revenue').textContent = formatCurrency(stats.total_revenue || 0);

    // Load recent system audit logs
    loadAdminAuditLogs();

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Audit Logs Table
async function loadAdminAuditLogs() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;

  try {
    const res = await api.get('/admin/audit-logs');
    if (!res.success || !res.logs) return;

    if (res.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#64748b;">No recent audit activity.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.logs.map(log => `
      <tr>
        <td>
          <span style="font-family:monospace;font-size:0.8rem;background:#f1f5f9;padding:3px 6px;border-radius:4px;font-weight:600;">
            ${escapeHtml(log.action)}
          </span>
        </td>
        <td>
          <div style="font-weight:600;">${escapeHtml(log.user_name || 'System')}</div>
          <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(log.user_role || '')}</div>
        </td>
        <td>
          <span class="badge badge-info">${escapeHtml(log.entity_type)} #${escapeHtml(log.entity_id)}</span>
        </td>
        <td>
          <div style="font-size:0.8rem;color:#475569;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(JSON.stringify(log.details))}
          </div>
        </td>
        <td>
          <div style="font-size:0.8rem;color:#64748b;">${formatDate(log.created_at)}</div>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error(error);
  }
}

// Load Doctors for Admin Verification & Governance
async function loadAdminDoctors() {
  const tbody = document.getElementById('admin-doctors-tbody');
  try {
    const res = await api.get('/admin/doctors');
    if (!res.success || !res.doctors) return;

    tbody.innerHTML = res.doctors.map(d => `
      <tr>
        <td>
          <div style="font-weight:700;">${escapeHtml(d.name)}</div>
          <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(d.email)} &bull; ${escapeHtml(d.phone || 'No phone')}</div>
        </td>
        <td>
          <div style="font-weight:600;color:var(--primary);">${escapeHtml(d.specialty)}</div>
          <div style="font-size:0.75rem;color:#64748b;">${(d.qualifications || []).join(', ')} &bull; ${d.experience_years} yrs</div>
        </td>
        <td>
          <span style="font-family:monospace;font-weight:700;color:#0f172a;background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:0.82rem;">
            ${escapeHtml(d.license_number)}
          </span>
        </td>
        <td>
          ${d.is_verified
        ? `<span class="badge badge-success">Verified</span>`
        : `<span class="badge badge-warning">Pending Review</span>`}
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
          </div>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Verify / Reject Doctor
async function verifyDoctorAction(doctorId, action) {
  const notes = prompt(`Enter verification governance notes (optional):`, action === 'approve' ? 'Medical credentials verified via NMC Registry.' : 'License rejected.');
  if (notes === null) return;

  try {
    const res = await api.post(`/admin/doctors/${doctorId}/verify`, {
      action,
      verification_notes: notes
    });
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminDoctors();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Patients for Admin
async function loadAdminPatients() {
  const tbody = document.getElementById('admin-patients-tbody');
  try {
    const res = await api.get('/admin/patients');
    if (!res.success || !res.patients) return;

    tbody.innerHTML = res.patients.map(p => `
      <tr>
        <td>
          <div style="font-weight:700;">${escapeHtml(p.name)}</div>
          <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(p.email)} &bull; ${escapeHtml(p.phone || '')}</div>
        </td>
        <td>
          <span class="badge badge-teal">${escapeHtml(p.blood_group || 'Unknown')}</span>
          <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">DOB: ${formatDate(p.date_of_birth)} (${escapeHtml(p.gender)})</div>
        </td>
        <td>
          <div style="font-size:0.85rem;font-weight:600;">${escapeHtml(p.insurance_provider || 'Not provided')}</div>
          <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(p.insurance_policy_number || '')}</div>
        </td>
        <td>
          <div style="font-size:0.85rem;">${p.total_appointments || 0} visits</div>
          <div style="font-size:0.75rem;color:#64748b;">${p.total_records || 0} vault docs</div>
        </td>
        <td>${getStatusBadge(p.user_status)}</td>
        <td>
          ${p.user_status === 'active' ? `
            <button class="btn btn-danger btn-sm" onclick="toggleUserStatus(${p.user_id}, 'suspended')">Suspend</button>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="toggleUserStatus(${p.user_id}, 'active')">Unsuspend</button>
          `}
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Toggle Any User Status (Active / Suspended)
async function toggleUserStatus(userId, newStatus) {
  if (!confirm(`Are you sure you want to change this account status to ${newStatus}?`)) return;
  try {
    const res = await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
    if (res.success) {
      showToast(res.message, 'info');
      if (document.getElementById('admin-doctors-tbody')) loadAdminDoctors();
      if (document.getElementById('admin-patients-tbody')) loadAdminPatients();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Hospital-wide Appointments Oversight
async function loadAdminAppointments() {
  const tbody = document.getElementById('admin-appts-tbody');
  try {
    const res = await api.get('/admin/appointments');
    if (!res.success || !res.appointments) return;

    tbody.innerHTML = res.appointments.map(a => `
      <tr>
        <td>#${a.id}</td>
        <td>
          <div style="font-weight:700;">${escapeHtml(a.patient_name)}</div>
          <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(a.patient_email)}</div>
        </td>
        <td>
          <div style="font-weight:700;">${escapeHtml(a.doctor_name)}</div>
          <div style="font-size:0.8rem;color:#0d9488;font-weight:600;">${escapeHtml(a.doctor_specialty)}</div>
        </td>
        <td>
          <div style="font-weight:600;">${formatDate(a.appointment_date)}</div>
          <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(a.time_slot)}</div>
        </td>
        <td>
          <span style="font-weight:700;">${formatCurrency(a.fee)}</span>
        </td>
        <td>${getStatusBadge(a.status)}</td>
      </tr>
    `).join('');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Visual Analytics
async function loadAdminAnalytics() {
  try {
    const res = await api.get('/admin/analytics');
    if (!res.success) return;

    // Specialty Breakdown List
    const specContainer = document.getElementById('analytics-specialties');
    if (specContainer) {
      specContainer.innerHTML = (res.specialties || []).map(s => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-weight:600;">${escapeHtml(s.specialty)}</span>
          <span class="badge badge-teal">${s.count} Specialists</span>
        </div>
      `).join('') || '<div style="color:#64748b;">No specialty data.</div>';
    }

    // Appointment Status Breakdown
    const statusContainer = document.getElementById('analytics-statuses');
    if (statusContainer) {
      statusContainer.innerHTML = (res.appointment_statuses || []).map(s => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-weight:600;text-transform:capitalize;">${escapeHtml(s.status)}</span>
          <span class="badge badge-info">${s.count} Bookings</span>
        </div>
      `).join('') || '<div style="color:#64748b;">No status data.</div>';
    }

    // Records by Category Breakdown
    const recordsContainer = document.getElementById('analytics-records');
    if (recordsContainer) {
      recordsContainer.innerHTML = (res.record_types || []).map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-weight:600;">${escapeHtml(r.record_type.replace('_', ' '))}</span>
          <span class="badge badge-neutral">${r.count} Files</span>
        </div>
      `).join('') || '<div style="color:#64748b;">No record data.</div>';
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}
