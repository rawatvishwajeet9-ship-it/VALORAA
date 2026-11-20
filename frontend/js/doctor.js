/**
 * VALORA Healthcare Management Platform - Physician / Doctor Portal Logic
 */

// Load Doctor Dashboard
async function loadDoctorDashboard() {
  try {
    const res = await api.get('/doctor/dashboard');
    if (!res.success) return;

    const stats = res.stats || {};
    const statToday = document.getElementById('stat-today');
    const statPatients = document.getElementById('stat-patients');
    const statConsults = document.getElementById('stat-consults');
    const statFee = document.getElementById('stat-fee');

    if (statToday) statToday.textContent = stats.today_appointments || 0;
    if (statPatients) statPatients.textContent = stats.total_patients || 0;
    if (statConsults) statConsults.textContent = stats.total_consultations || 0;
    if (statFee) statFee.textContent = formatCurrency(stats.consultation_fee || 500);

    const user = getCurrentUser();
    const docNameHeader = document.getElementById('doc-display-name');
    const doctorName = (res.doctor && res.doctor.name) || stats.name || (user ? user.name : 'Doctor');
    if (docNameHeader) docNameHeader.textContent = doctorName;

    const docMetaLine = document.getElementById('doc-display-meta');
    if (docMetaLine) {
      docMetaLine.textContent = `Specialty: ${stats.specialty || 'General Medicine'} • License: ${stats.license_number || 'N/A'} • Fee: ${formatCurrency(stats.consultation_fee || 500)}`;
    }

    const queueCountBadge = document.getElementById('queue-count-badge');
    if (queueCountBadge) {
      const qLen = (res.appointment_queue || []).length;
      queueCountBadge.textContent = `(${qLen})`;
    }

    const queueContainer = document.getElementById('doctor-queue-container');
    if (queueContainer) {
      const queue = res.appointment_queue || [];
      if (queue.length === 0) {
        queueContainer.innerHTML = `<div style="text-align:center;padding:36px;color:#94a3b8;font-size:0.9rem;">No patient consultations scheduled for today.</div>`;
      } else {
        queueContainer.innerHTML = queue.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f1f5f9;background:#ffffff;border-radius:10px;margin-bottom:8px;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:16px;">
              <div style="background:#e6f7f5;color:#0d9488;font-weight:800;font-size:0.85rem;padding:8px 12px;border-radius:10px;text-align:center;min-width:64px;">
                ${escapeHtml(a.time_slot || '10:00')}
              </div>
              <div>
                <div style="font-weight:700;font-size:0.95rem;color:#0f172a;">${escapeHtml(a.patient_name)}</div>
                <div style="font-size:0.8rem;color:#64748b;margin-top:2px;">
                  ${escapeHtml(a.time_slot || '')} &bull; ${escapeHtml(a.type || 'In-Person')} &bull; <span style="color:#475569;">${escapeHtml(a.reason || 'Checkup')}</span>
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              ${getStatusBadge(a.status)}
              ${a.status === 'scheduled' ? `
                <button class="btn btn-sm" style="background:#0d9488;color:#ffffff;font-weight:700;border:none;padding:6px 14px;border-radius:8px;" onclick="updateDoctorApptStatus(${a.id}, 'confirmed')">
                  Confirm Booking
                </button>
              ` : ''}
              ${a.status === 'confirmed' ? `
                <button class="btn btn-outline btn-sm" style="color:#7c3aed;border-color:#ddd6fe;" onclick="openDoctorUploadModal(${a.patient_id}, '${escapeHtml(a.patient_name)}')">
                  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload Report
                </button>
                <button class="btn btn-primary btn-sm" onclick="openConsultationModal(${a.id}, ${a.patient_id}, '${escapeHtml(a.patient_name)}', '${escapeHtml(a.time_slot || '')}')">
                  Start Consultation
                </button>
              ` : ''}
            </div>
          </div>
        `).join('');
      }
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Doctor Appointments Management Page
async function loadDoctorAppointments() {
  const container = document.getElementById('doctor-appts-list');
  const statusFilter = document.querySelector('.filter-pill.active')?.getAttribute('data-status') || '';

  try {
    const res = await api.get('/appointments', { status: statusFilter });
    if (!res.success) return;

    if (!res.appointments || res.appointments.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:#94a3b8;font-size:0.92rem;">No clinical appointments found under current filter.</div>`;
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
                <span style="font-size:1.05rem;font-weight:800;color:#0f172a;">${escapeHtml(a.patient_name)}</span>
                ${getStatusBadge(a.status)}
              </div>
              <div style="font-size:0.82rem;color:#64748b;margin:4px 0;">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${escapeHtml(a.time_slot)} &bull; ${escapeHtml(a.type)} &bull; Phone: ${escapeHtml(a.patient_phone || 'N/A')}
              </div>
              <div style="font-size:0.8rem;color:#334155;background:#f8fafc;padding:4px 10px;border-radius:6px;display:inline-block;border:1px solid #f1f5f9;">
                <strong>Patient Symptoms / Reason:</strong> ${escapeHtml(a.reason || 'General Consultation')}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            ${a.status === 'scheduled' ? `
              <button class="btn btn-sm" style="background:#0d9488;color:#ffffff;font-weight:700;border:none;padding:7px 14px;border-radius:8px;" onclick="updateDoctorApptStatus(${a.id}, 'confirmed')">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="white"><polyline points="20 6 9 17 4 12"/></svg> Confirm Appointment
              </button>
              <button class="btn btn-sm" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:7px 12px;border-radius:8px;" onclick="updateDoctorApptStatus(${a.id}, 'cancelled')">
                &times; Decline
              </button>
            ` : ''}

            ${a.status === 'confirmed' ? `
              <button class="btn btn-outline btn-sm" style="color:#7c3aed;border-color:#ddd6fe;" onclick="openDoctorUploadModal(${a.patient_id}, '${escapeHtml(a.patient_name)}')">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload Report
              </button>
              <button class="btn btn-primary btn-sm" onclick="openConsultationModal(${a.id}, ${a.patient_id}, '${escapeHtml(a.patient_name)}', '${escapeHtml(a.time_slot)}')">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="white"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Start Consultation
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Update Appointment Status
async function updateDoctorApptStatus(appointmentId, newStatus) {
  try {
    const res = await api.patch(`/appointments/${appointmentId}/status`, {
      status: newStatus,
      notes: `Updated by physician to ${newStatus}`
    });
    if (res.success) {
      showToast(`Appointment status updated to ${newStatus}.`, 'info');
      if (document.getElementById('doctor-appts-list')) {
        loadDoctorAppointments();
      } else {
        loadDoctorDashboard();
      }
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load Authorized Patients Roster
let allPatientsCache = [];

async function loadDoctorPatients() {
  const container = document.getElementById('doctor-patients-grid');
  if (!container) return;

  try {
    const res = await api.get('/doctor/patients');
    if (!res.success) return;

    allPatientsCache = res.patients || [];
    renderDoctorPatients(allPatientsCache);

  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderDoctorPatients(patients) {
  const container = document.getElementById('doctor-patients-grid');
  if (!container) return;

  if (patients.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:#94a3b8;font-size:0.92rem;">No authorized patients found in your clinical caseload.</div>`;
    return;
  }

  container.innerHTML = patients.map(p => {
    const initial = (p.name || 'P')[0].toLowerCase();
    const allergiesList = (p.allergies || []).join(', ');

    return `
      <div style="background:#ffffff;border:1px solid var(--border-color);border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,0.03);display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <!-- Patient Card Top -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:42px;height:42px;border-radius:12px;background:#e6f7f5;color:#0d9488;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;">
                ${initial}
              </div>
              <div>
                <div style="font-weight:800;font-size:1.05rem;color:#0f172a;">${escapeHtml(p.name)}</div>
                <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(p.email)}</div>
              </div>
            </div>
            <span class="badge" style="background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;font-weight:700;">
              ${escapeHtml(p.blood_group || 'Unknown')}
            </span>
          </div>

          <!-- Patient 4-Cell Stats Block -->
          <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;letter-spacing:0.04em;">PHONE</div>
              <div style="font-size:0.85rem;font-weight:600;color:#334155;">${escapeHtml(p.phone ? ('+91 ' + p.phone) : 'Not recorded')}</div>
            </div>
            <div>
              <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;letter-spacing:0.04em;">GENDER</div>
              <div style="font-size:0.85rem;font-weight:600;color:#334155;text-transform:capitalize;">${escapeHtml(p.gender || 'Not specified')}</div>
            </div>
            <div>
              <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;letter-spacing:0.04em;">ALLERGIES</div>
              <div style="font-size:0.85rem;font-weight:600;color:${allergiesList ? '#dc2626' : '#64748b'};">${allergiesList || 'None'}</div>
            </div>
            <div>
              <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;letter-spacing:0.04em;">TOTAL VISITS</div>
              <div style="font-size:0.85rem;font-weight:600;color:#334155;">${p.total_visits || 1} consultations</div>
            </div>
          </div>
        </div>

        <div>
          <!-- Big Button: View Medical History -->
          <button class="btn" style="width:100%;background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;font-weight:700;margin-bottom:10px;" onclick="viewPatientRecordsModal(${p.id}, '${escapeHtml(p.name)}')">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            View Medical History &amp; Prior Consultations
          </button>

          <!-- 3 Pill Action Buttons -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1.1fr;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="openConsultationModal(null, ${p.id}, '${escapeHtml(p.name)}', 'Clinical Visit')">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              Clinical Note
            </button>
            <button class="btn btn-outline btn-sm" onclick="openPrescriptionModal(${p.id}, '${escapeHtml(p.name)}')">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/></svg>
              Issue Rx
            </button>
            <button class="btn btn-outline btn-sm" style="color:#7c3aed;border-color:#ddd6fe;" onclick="openDoctorUploadModal(${p.id}, '${escapeHtml(p.name)}')">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Report
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterPatientsRoster(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderDoctorPatients(allPatientsCache);
    return;
  }
  const filtered = allPatientsCache.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.email || '').toLowerCase().includes(q) ||
    (p.blood_group || '').toLowerCase().includes(q)
  );
  renderDoctorPatients(filtered);
}

// Open Consultation Modal & Preload Patient's Latest Updated Vitals
async function openConsultationModal(apptId, patientId, patientName, timeSlot = '10:00 AM') {
  document.getElementById('consult-appt-id').value = apptId || '';
  document.getElementById('consult-patient-id').value = patientId;
  document.getElementById('consult-patient-name-display').textContent = patientName;
  document.getElementById('consult-timeslot-badge').textContent = `Apt: ${timeSlot}`;

  const bpInput = document.getElementById('consult-bp');
  const hrInput = document.getElementById('consult-hr');
  const tempInput = document.getElementById('consult-temp');
  const spo2Input = document.getElementById('consult-spo2');
  const weightInput = document.getElementById('consult-weight');
  const metaEl = document.getElementById('consult-vitals-meta');

  if (metaEl) {
    metaEl.textContent = 'Fetching latest clinical vitals...';
    metaEl.style.color = '#0d9488';
  }

  openModal('modal-consultation');

  try {
    const res = await api.get(`/patient/${patientId}/vitals`);
    if (res.success && res.vitals) {
      const v = res.vitals;
      if (bpInput) bpInput.value = v.blood_pressure || '120/80 mmHg';
      if (hrInput) hrInput.value = v.heart_rate || 72;
      if (tempInput) tempInput.value = v.temperature || 98.6;
      if (spo2Input) spo2Input.value = v.spo2 || 99;
      if (weightInput) weightInput.value = v.weight_kg || 70;

      if (metaEl) {
        if (v.last_updated_at) {
          metaEl.textContent = `Latest Patient Vitals: Updated by ${v.last_updated_by || 'Physician'} (${formatDate(v.last_updated_at)})`;
          metaEl.style.color = '#0d9488';
        } else {
          metaEl.textContent = 'Baseline Clinical Vitals (No prior consultation logged)';
          metaEl.style.color = '#64748b';
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch latest patient vitals:', err);
  }
}

// Submit Consultation Form with Strict Physiological Validation
async function submitConsultation(e) {
  e.preventDefault();
  const appointment_id = document.getElementById('consult-appt-id').value ? parseInt(document.getElementById('consult-appt-id').value) : null;
  const patient_id = parseInt(document.getElementById('consult-patient-id').value);
  const diagnosis = document.getElementById('consult-diagnosis').value.trim();
  const symptomsRaw = document.getElementById('consult-symptoms').value;
  const clinical_notes = document.getElementById('consult-notes').value;
  const treatment_plan = document.getElementById('consult-treatment').value;
  const bp = document.getElementById('consult-bp').value.trim();
  const hr = parseInt(document.getElementById('consult-hr').value);
  const temp = parseFloat(document.getElementById('consult-temp').value);
  const spo2 = parseInt(document.getElementById('consult-spo2').value);
  const weightInput = document.getElementById('consult-weight').value;
  const weight = weightInput ? parseFloat(weightInput) : null;
  const follow_up_date = document.getElementById('consult-followup').value;

  if (!diagnosis || diagnosis.length < 2) {
    showToast('Clinical diagnosis is required (minimum 2 characters).', 'error');
    document.getElementById('consult-diagnosis').focus();
    return;
  }

  // Strictly Validate Blood Pressure (Systolic/Diastolic)
  const bpMatch = bp.match(/^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmHg)?$/i);
  if (!bpMatch) {
    showToast('Invalid Blood Pressure format. Use systolic/diastolic format (e.g. 120/80 mmHg).', 'error');
    document.getElementById('consult-bp').focus();
    return;
  }
  const sys = parseInt(bpMatch[1], 10);
  const dia = parseInt(bpMatch[2], 10);
  if (sys < 50 || sys > 260) {
    showToast('Systolic blood pressure must be between 50 and 260 mmHg.', 'error');
    document.getElementById('consult-bp').focus();
    return;
  }
  if (dia < 30 || dia > 180) {
    showToast('Diastolic blood pressure must be between 30 and 180 mmHg.', 'error');
    document.getElementById('consult-bp').focus();
    return;
  }
  if (sys <= dia) {
    showToast('Systolic pressure must be strictly greater than diastolic pressure.', 'error');
    document.getElementById('consult-bp').focus();
    return;
  }
  const formattedBp = `${sys}/${dia} mmHg`;

  // Strictly Validate Physiological Ranges
  if (isNaN(hr) || hr < 35 || hr > 220) {
    showToast('Pulse / Heart rate must be between 35 and 220 bpm.', 'error');
    document.getElementById('consult-hr').focus();
    return;
  }
  if (isNaN(temp) || temp < 90.0 || temp > 108.0) {
    showToast('Body temperature must be between 90.0°F and 108.0°F.', 'error');
    document.getElementById('consult-temp').focus();
    return;
  }
  if (isNaN(spo2) || spo2 < 60 || spo2 > 100) {
    showToast('SpO2 oxygen saturation must be between 60% and 100%.', 'error');
    document.getElementById('consult-spo2').focus();
    return;
  }
  if (weight !== null && (isNaN(weight) || weight < 1.0 || weight > 400.0)) {
    showToast('Patient weight must be between 1 kg and 400 kg.', 'error');
    document.getElementById('consult-weight').focus();
    return;
  }
  if (follow_up_date) {
    const today = new Date().toISOString().split('T')[0];
    if (follow_up_date < today) {
      showToast('Follow-up review date cannot be in the past.', 'error');
      document.getElementById('consult-followup').focus();
      return;
    }
  }

  try {
    const res = await api.post('/consultations', {
      appointment_id,
      patient_id,
      diagnosis,
      symptoms: symptomsRaw.split(',').map(s => s.trim()).filter(Boolean),
      clinical_notes,
      treatment_plan,
      blood_pressure: formattedBp,
      heart_rate: hr,
      temperature: temp,
      spo2,
      weight_kg: weight,
      follow_up_date
    });

    if (res.success) {
      closeModal('modal-consultation');
      showToast('Consultation notes saved & verified!', 'success');

      const patientName = document.getElementById('consult-patient-name-display').textContent;
      if (confirm('Consultation recorded! Would you like to issue a Digital Prescription now?')) {
        openPrescriptionModal(patient_id, patientName, res.consultation_id, appointment_id);
      } else {
        if (document.getElementById('doctor-appts-list')) loadDoctorAppointments();
        else if (document.getElementById('doctor-patients-grid')) loadDoctorPatients();
        else loadDoctorDashboard();
      }
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Predefined Prescribable Medications Catalog
const PREDEFINED_MEDICATIONS = [
  {
    category: "Pain, Fever & Anti-Inflammatory",
    items: [
      "Paracetamol 500mg",
      "Paracetamol 650mg (Dolo / Calpol)",
      "Ibuprofen 400mg (Brufen)",
      "Aceclofenac 100mg + Paracetamol 325mg (Zerodol-P)",
      "Mefenamic Acid 500mg (Meftal)",
      "Tramadol 50mg"
    ]
  },
  {
    category: "Antibiotics & Anti-Infectives",
    items: [
      "Amoxicillin 500mg (Novamox)",
      "Amoxicillin 500mg + Clavulanic Acid 125mg (Augmentin 625)",
      "Azithromycin 500mg (Azee / Zithromax)",
      "Ciprofloxacin 500mg (Ciplox)",
      "Doxycycline 100mg (Dox-100)",
      "Cefixime 200mg (Taxim-O)",
      "Metronidazole 400mg (Flagyl)"
    ]
  },
  {
    category: "Gastrointestinal, Acid & Nausea",
    items: [
      "Pantoprazole 40mg (Pan 40)",
      "Omeprazole 20mg (Omez)",
      "Rabeprazole 20mg (Rablet)",
      "Domperidone 10mg + Pantoprazole 40mg (Pan-D)",
      "Ondansetron 4mg (Emeset)",
      "Antacid Suspension 10ml (Gelusil / Digene)"
    ]
  },
  {
    category: "Cardiovascular & Hypertension",
    items: [
      "Amlodipine 5mg (Amlong)",
      "Telmisartan 40mg (Telma 40)",
      "Telmisartan 40mg + Amlodipine 5mg (Telma-AM)",
      "Losartan 50mg (Repace)",
      "Atenolol 50mg (Aten)",
      "Atorvastatin 10mg (Atorva 10)",
      "Atorvastatin 20mg",
      "Ecosprin 75mg (Aspirin)"
    ]
  },
  {
    category: "Diabetes & Endocrine",
    items: [
      "Metformin 500mg (Glycomet)",
      "Metformin 1000mg (Glycomet SR)",
      "Glimepiride 1mg (Amaryl)",
      "Glimepiride 2mg",
      "Thyroxine Sodium 25mcg (Thyronorm)",
      "Thyroxine Sodium 50mcg",
      "Thyroxine Sodium 100mcg"
    ]
  },
  {
    category: "Respiratory, Cough & Allergy",
    items: [
      "Cetirizine 10mg (Cetzine)",
      "Levocetirizine 5mg (Levocet)",
      "Montelukast 10mg + Levocetirizine 5mg (Montair-LC)",
      "Dextromethorphan Cough Syrup 100ml",
      "Ambroxol + Levosalbutamol Cough Syrup",
      "Salbutamol Inhaler (Asthalin)"
    ]
  },
  {
    category: "Vitamins, Minerals & Supplements",
    items: [
      "Calcium Carbonate 500mg + Vitamin D3 (Shelcal 500)",
      "Vitamin B-Complex + Zinc (Becosules)",
      "Vitamin C 500mg + Zinc (Limcee)",
      "Iron + Folic Acid (Dexorange)",
      "Vitamin D3 60,000 IU (Calcirol)",
      "ORS Electrolyte Powder Sachet"
    ]
  }
];

// Open Prescription Modal
function openPrescriptionModal(patientId, patientName, consultId = null, apptId = null) {
  document.getElementById('rx-patient-id').value = patientId;
  document.getElementById('rx-consult-id').value = consultId || '';
  document.getElementById('rx-appt-id').value = apptId || '';
  document.getElementById('rx-patient-name-banner').textContent = `Patient: ${patientName}`;
  
  const container = document.getElementById('medications-container');
  if (container) {
    container.innerHTML = '';
    addMedicationRow();
  }
  
  openModal('modal-prescription');
}

// Add Medication Row to Prescription Modal with Predefined List & Custom Other
function addMedicationRow(preset = null) {
  const container = document.getElementById('medications-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'form-row rx-med-row';
  row.style.marginBottom = '12px';
  row.style.padding = '12px';
  row.style.background = '#f8fafc';
  row.style.border = '1px solid #e2e8f0';
  row.style.borderRadius = '10px';

  let optionsHtml = '<option value="" disabled selected>-- Select Prescribed Medicine --</option>';
  PREDEFINED_MEDICATIONS.forEach(cat => {
    optionsHtml += `<optgroup label="${escapeHtml(cat.category)}">`;
    cat.items.forEach(item => {
      optionsHtml += `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`;
    });
    optionsHtml += `</optgroup>`;
  });
  optionsHtml += `<option value="OTHER" style="font-weight:700;color:#0d9488;">Other (Specify Custom Medicine)...</option>`;

  row.innerHTML = `
    <div style="display:grid;grid-template-columns:2.5fr 1.2fr 1.2fr 1fr 2fr auto;gap:8px;align-items:start;">
      <div>
        <label class="form-label" style="font-size:0.7rem;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Medicine *</label>
        <select class="form-control med-select" onchange="handleMedSelectChange(this)" required>
          ${optionsHtml}
        </select>
        <input type="text" class="form-control med-custom-name" placeholder="Type custom medicine name & strength..." style="display:none;margin-top:6px;border-color:#0d9488;background:#ffffff;">
      </div>
      <div>
        <label class="form-label" style="font-size:0.7rem;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Dosage *</label>
        <input type="text" class="form-control med-dosage" list="rx-dosage-list" placeholder="1 tablet" value="${preset?.dosage || '1 tablet'}" required>
      </div>
      <div>
        <label class="form-label" style="font-size:0.7rem;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Frequency *</label>
        <input type="text" class="form-control med-freq" list="rx-freq-list" placeholder="Twice daily (1-0-1)" value="${preset?.frequency || 'Twice daily'}" required>
      </div>
      <div>
        <label class="form-label" style="font-size:0.7rem;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Duration *</label>
        <input type="text" class="form-control med-duration" list="rx-duration-list" placeholder="5 days" value="${preset?.duration || '5 days'}" required>
      </div>
      <div>
        <label class="form-label" style="font-size:0.7rem;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Instructions</label>
        <input type="text" class="form-control med-inst" list="rx-inst-list" placeholder="Take after meals with water" value="${preset?.instructions || 'Take after meal'}">
      </div>
      <div style="padding-top:20px;">
        <button type="button" class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:none;padding:8px 10px;border-radius:6px;font-weight:700;" title="Remove Medicine" onclick="this.closest('.rx-med-row').remove()">&times;</button>
      </div>
    </div>
  `;
  container.appendChild(row);

  if (preset && preset.name) {
    const sel = row.querySelector('.med-select');
    const custom = row.querySelector('.med-custom-name');
    let matched = false;
    for (let opt of sel.options) {
      if (opt.value.toLowerCase() === preset.name.toLowerCase()) {
        sel.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched) {
      sel.value = 'OTHER';
      custom.style.display = 'block';
      custom.value = preset.name;
    }
  }
}

function handleMedSelectChange(selectEl) {
  const row = selectEl.closest('.rx-med-row');
  const customInput = row.querySelector('.med-custom-name');
  if (selectEl.value === 'OTHER') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = '';
  }
}

// Submit Prescription Form
async function submitPrescription(e) {
  e.preventDefault();
  const patient_id = parseInt(document.getElementById('rx-patient-id').value);
  const consultation_id = document.getElementById('rx-consult-id').value ? parseInt(document.getElementById('rx-consult-id').value) : null;
  const appointment_id = document.getElementById('rx-appt-id').value ? parseInt(document.getElementById('rx-appt-id').value) : null;

  const medRows = document.querySelectorAll('#medications-container .rx-med-row');
  const medications = [];

  for (const row of medRows) {
    const sel = row.querySelector('.med-select');
    const custom = row.querySelector('.med-custom-name');
    let medName = sel ? sel.value : '';
    if (medName === 'OTHER') {
      medName = custom ? custom.value.trim() : '';
    }
    if (!medName) {
      showToast('Please select or specify a medication name for all prescribed drugs.', 'error');
      if (custom && custom.style.display !== 'none') custom.focus();
      else if (sel) sel.focus();
      return;
    }

    const dosage = row.querySelector('.med-dosage')?.value.trim() || '1 tablet';
    const frequency = row.querySelector('.med-freq')?.value.trim() || 'Once daily';
    const duration = row.querySelector('.med-duration')?.value.trim() || '5 days';
    const instructions = row.querySelector('.med-inst')?.value.trim() || 'After meals';

    medications.push({
      name: medName,
      drug_name: medName,
      medicineName: medName,
      dosage,
      frequency,
      duration,
      instructions
    });
  }

  if (medications.length === 0) {
    showToast('Please add at least one medication to the prescription.', 'error');
    return;
  }

  const labTests = document.getElementById('rx-lab-tests')?.value || '';
  const generalAdvice = document.getElementById('rx-general-advice')?.value || '';

  try {
    const res = await api.post('/prescriptions', {
      patient_id,
      consultation_id,
      appointment_id,
      medications,
      tests_recommended: labTests.split(',').map(t => t.trim()).filter(Boolean),
      general_instructions: generalAdvice
    });

    if (res.success) {
      closeModal('modal-prescription');
      showToast('Digital prescription issued and authorized!', 'success');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// View Comprehensive Patient Clinical History & Prior Consultations in Doctor Modal
async function viewPatientRecordsModal(patientId, patientName) {
  const nameEl = document.getElementById('records-modal-patient-name');
  if (nameEl) nameEl.textContent = patientName;
  const container = document.getElementById('modal-patient-records-list');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:48px 24px;color:#64748b;">
      <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#0d9488;border-radius:50%;margin:0 auto 16px;animation:spin 0.8s linear infinite;"></div>
      <div style="font-weight:700;font-size:1rem;color:#0f172a;">Loading Comprehensive Clinical Dossier...</div>
      <div style="font-size:0.82rem;color:#64748b;margin-top:4px;">Retrieving patient profile, prior doctor consultations, vitals, prescriptions, and diagnostic imaging</div>
    </div>
  `;
  openModal('modal-patient-records');

  try {
    const res = await api.get('/patient/history', { patient_id: patientId });
    if (!res.success) {
      container.innerHTML = `<div style="text-align:center;padding:36px;color:#dc2626;">Failed to load patient history: ${escapeHtml(res.message || 'Unknown error')}</div>`;
      return;
    }

    const patient = res.patient || {};
    const timeline = res.timeline || [];
    const reports = res.reports || [];

    // Helper: calculate readable age from DOB string
    function formatPatientAge(dobStr) {
      if (!dobStr) return 'N/A';
      const dob = new Date(dobStr);
      if (isNaN(dob.getTime())) return 'N/A';
      const now = new Date();
      let years = now.getFullYear() - dob.getFullYear();
      let m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        years--;
      }
      if (years >= 1) return `${years} yrs`;
      const diffDays = Math.floor((now - dob) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Newborn (0 days)';
      if (diffDays < 30) return `${diffDays} days`;
      const months = Math.floor(diffDays / 30.4375);
      return `${months} mos`;
    }

    const patientAge = formatPatientAge(patient.date_of_birth);
    const bloodGroup = patient.blood_group || 'Not recorded';
    const allergies = patient.allergies ? patient.allergies.trim() : '';
    const conditions = patient.chronic_conditions ? patient.chronic_conditions.trim() : '';
    const phone = patient.phone || 'N/A';
    const email = patient.email || 'N/A';
    const gender = patient.gender || 'Not specified';
    const emergencyContact = patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_relation || 'Contact'}: ${patient.emergency_contact_phone || 'N/A'})` : 'None documented';

    let html = `
      <!-- 1. Patient Clinical Baseline & Demographic Summary -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:52px;height:52px;border-radius:12px;background:#e6f7f5;color:#0d9488;font-weight:800;font-size:1.3rem;display:flex;align-items:center;justify-content:center;border:1px solid #99f6e4;">
              ${escapeHtml((patient.name || patientName || 'P').charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-size:1.2rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                ${escapeHtml(patient.name || patientName)}
                <span class="badge" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:0.75rem;padding:2px 8px;">Active Patient</span>
              </div>
              <div style="font-size:0.82rem;color:#64748b;margin-top:2px;">
                ${escapeHtml(email)} &bull; ${escapeHtml(phone)}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <span class="badge" style="background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;font-size:0.85rem;font-weight:800;padding:6px 12px;">
              Blood Group: ${escapeHtml(bloodGroup)}
            </span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #f1f5f9;font-size:0.82rem;">
          <div>
            <span style="color:#64748b;font-weight:600;display:block;">Age &amp; DOB:</span>
            <strong style="color:#0f172a;">${patientAge}</strong> <span style="color:#94a3b8;">(${patient.date_of_birth ? formatDate(patient.date_of_birth) : 'DOB not set'})</span>
          </div>
          <div>
            <span style="color:#64748b;font-weight:600;display:block;">Gender:</span>
            <strong style="color:#0f172a;">${escapeHtml(gender)}</strong>
          </div>
          <div>
            <span style="color:#64748b;font-weight:600;display:block;">Recorded Vitals Baseline:</span>
            <strong style="color:#0f172a;">${patient.height_cm ? patient.height_cm + ' cm' : '--'} &bull; ${patient.weight_kg ? patient.weight_kg + ' kg' : '--'}</strong>
          </div>
          <div>
            <span style="color:#64748b;font-weight:600;display:block;">Emergency Contact:</span>
            <strong style="color:#0f172a;">${escapeHtml(emergencyContact)}</strong>
          </div>
        </div>

        <!-- Clinical Alerts: Allergies & Chronic Conditions -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div style="background:${allergies ? '#fff1f2' : '#f8fafc'};border:1px solid ${allergies ? '#fecdd3' : '#e2e8f0'};border-radius:8px;padding:10px 14px;">
            <div style="font-size:0.75rem;font-weight:700;color:${allergies ? '#be123c' : '#64748b'};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">
              Known Drug / Environmental Allergies
            </div>
            <div style="font-size:0.85rem;color:${allergies ? '#9f1239' : '#334155'};font-weight:${allergies ? '700' : '500'};">
              ${allergies ? escapeHtml(allergies) : 'No known drug allergies reported'}
            </div>
          </div>
          <div style="background:${conditions ? '#eff6ff' : '#f8fafc'};border:1px solid ${conditions ? '#bfdbfe' : '#e2e8f0'};border-radius:8px;padding:10px 14px;">
            <div style="font-size:0.75rem;font-weight:700;color:${conditions ? '#1d4ed8' : '#64748b'};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">
              Documented Chronic Conditions
            </div>
            <div style="font-size:0.85rem;color:${conditions ? '#1e40af' : '#334155'};font-weight:${conditions ? '700' : '500'};">
              ${conditions ? escapeHtml(conditions) : 'None documented'}
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Interactive Navigation Tabs -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-sm history-tab-btn" id="tab-btn-all" onclick="switchHistoryTab('all')" style="background:#0d9488;color:#ffffff;font-weight:700;padding:6px 14px;border-radius:8px;">
            All Records (${timeline.length + reports.length})
          </button>
          <button type="button" class="btn btn-sm btn-outline history-tab-btn" id="tab-btn-consults" onclick="switchHistoryTab('consults')" style="font-weight:700;padding:6px 14px;border-radius:8px;">
            Doctor Consultations (${timeline.length})
          </button>
          <button type="button" class="btn btn-sm btn-outline history-tab-btn" id="tab-btn-reports" onclick="switchHistoryTab('reports')" style="font-weight:700;padding:6px 14px;border-radius:8px;">
            Diagnostic Reports &amp; Scans (${reports.length})
          </button>
        </div>
        <span style="font-size:0.75rem;color:#64748b;font-weight:600;">
          Chronologically sorted &bull; Most recent first
        </span>
      </div>

      <!-- Content Container: Doctor Consultations -->
      <div id="history-section-consultations" style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <h4 style="font-size:1.1rem;font-weight:800;color:#0f172a;margin:0;">Prior Physician Consultations &amp; Encounters</h4>
          <span class="badge" style="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;font-size:0.75rem;font-weight:700;">
            ${timeline.length} Visit${timeline.length === 1 ? '' : 's'}
          </span>
        </div>

        ${timeline.length === 0 ? `
          <div style="background:#ffffff;border:1px dashed #cbd5e1;border-radius:12px;padding:32px;text-align:center;color:#64748b;font-size:0.9rem;">
            No prior physician consultations on file for this patient.
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${timeline.map(c => {
              const rx = c.prescription;
              const meds = rx && rx.medications ? rx.medications : [];
              const tests = rx && rx.diagnostic_tests ? rx.diagnostic_tests : [];
              return `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                  
                  <!-- Consultation Header: Date, Doctor Name, Specialty, Clinic -->
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:14px;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                    <div>
                      <div style="font-size:0.75rem;font-weight:800;color:#0d9488;text-transform:uppercase;letter-spacing:0.04em;">
                        CONSULTATION VISIT &bull; ${formatDate(c.consultation_date || c.created_at)}
                      </div>
                      <div style="font-size:1.05rem;font-weight:800;color:#0f172a;margin-top:2px;">
                        Dr. ${escapeHtml(c.doctor_name || 'Attending Physician')}
                      </div>
                      <div style="font-size:0.8rem;color:#64748b;margin-top:2px;">
                        Specialty: <strong style="color:#334155;">${escapeHtml(c.specialty || 'General Practitioner')}</strong> &bull; ${escapeHtml(c.clinic_name || c.hospital_affiliation || 'VALORA Care Center')}
                      </div>
                    </div>
                    <div>
                      <span class="badge" style="background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;font-size:0.8rem;font-weight:700;padding:4px 10px;">
                        Diagnosis: ${escapeHtml(c.diagnosis)}
                      </span>
                    </div>
                  </div>

                  <!-- Reported Symptoms -->
                  ${c.symptoms && c.symptoms.length > 0 ? `
                    <div style="margin-bottom:12px;">
                      <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;">Reported Symptoms:</span>
                      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                        ${c.symptoms.map(s => `<span class="badge" style="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;font-size:0.75rem;padding:3px 8px;">${escapeHtml(s)}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Recorded Vitals at this Encounter -->
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:14px;">
                    <div style="font-size:0.72rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">
                      Vitals Recorded During Visit
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;font-size:0.82rem;">
                      <div>
                        <span style="color:#64748b;display:block;">Blood Pressure:</span>
                        <strong style="color:#0f172a;">${escapeHtml(c.blood_pressure || '120/80 mmHg')}</strong>
                      </div>
                      <div>
                        <span style="color:#64748b;display:block;">Heart Rate:</span>
                        <strong style="color:#0f172a;">${c.heart_rate || 72} bpm</strong>
                      </div>
                      <div>
                        <span style="color:#64748b;display:block;">Temperature:</span>
                        <strong style="color:#0f172a;">${c.temperature || 98.6} &deg;F</strong>
                      </div>
                      <div>
                        <span style="color:#64748b;display:block;">Oxygen (SpO2):</span>
                        <strong style="color:#0f172a;">${c.spo2 || 99}%</strong>
                      </div>
                      <div>
                        <span style="color:#64748b;display:block;">Weight / Height:</span>
                        <strong style="color:#0f172a;">${c.weight_kg ? c.weight_kg + ' kg' : '--'} / ${c.height_cm ? c.height_cm + ' cm' : '--'}</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Clinical Notes & Treatment Plan -->
                  ${c.clinical_notes ? `
                    <div style="margin-bottom:12px;">
                      <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px;">
                        Doctor Clinical Examination &amp; Notes
                      </div>
                      <div style="font-size:0.85rem;color:#334155;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #f1f5f9;line-height:1.4;">
                        ${escapeHtml(c.clinical_notes)}
                      </div>
                    </div>
                  ` : ''}

                  ${c.treatment_plan ? `
                    <div style="margin-bottom:12px;">
                      <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px;">
                        Treatment &amp; Management Plan
                      </div>
                      <div style="font-size:0.85rem;color:#334155;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #f1f5f9;line-height:1.4;">
                        ${escapeHtml(c.treatment_plan)}
                      </div>
                    </div>
                  ` : ''}

                  ${c.follow_up_date ? `
                    <div style="font-size:0.8rem;color:#0d9488;font-weight:700;margin-bottom:12px;">
                      Follow-up Review Scheduled: ${formatDate(c.follow_up_date)}
                    </div>
                  ` : ''}

                  <!-- Attached Prescription Details -->
                  ${meds.length > 0 ? `
                    <div style="margin-top:14px;border-top:1px solid #f1f5f9;padding-top:14px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:0.78rem;font-weight:800;color:#0d9488;text-transform:uppercase;letter-spacing:0.04em;">
                          Prescribed Medication Regimen (${meds.length})
                        </span>
                        <span style="font-size:0.72rem;color:#64748b;">Digitally Signed Electronic Rx</span>
                      </div>
                      <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                          <thead>
                            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;">
                              <th style="padding:8px 12px;font-weight:700;color:#475569;">Medication Name</th>
                              <th style="padding:8px 12px;font-weight:700;color:#475569;">Dosage</th>
                              <th style="padding:8px 12px;font-weight:700;color:#475569;">Frequency</th>
                              <th style="padding:8px 12px;font-weight:700;color:#475569;">Duration</th>
                              <th style="padding:8px 12px;font-weight:700;color:#475569;">Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${meds.map(m => {
                              const medName = m.name || m.medicineName || m.drug_name || m.medication_name || 'Medication';
                              return `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                  <td style="padding:8px 12px;font-weight:700;color:#0f172a;">${escapeHtml(medName)}</td>
                                  <td style="padding:8px 12px;color:#334155;">${escapeHtml(m.dosage || m.dose || '1 tablet')}</td>
                                  <td style="padding:8px 12px;color:#334155;">${escapeHtml(m.frequency || 'Once daily')}</td>
                                  <td style="padding:8px 12px;color:#334155;">${escapeHtml(m.duration || '5 days')}</td>
                                  <td style="padding:8px 12px;color:#64748b;">${escapeHtml(m.instructions || m.timing || 'Take as advised')}</td>
                                </tr>
                              `;
                            }).join('')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Ordered Diagnostic Tests -->
                  ${tests.length > 0 ? `
                    <div style="margin-top:10px;font-size:0.82rem;">
                      <span style="font-weight:700;color:#475569;">Diagnostic Investigations Ordered:</span>
                      <span style="color:#0d9488;font-weight:600;margin-left:4px;">${tests.map(t => escapeHtml(typeof t === 'string' ? t : (t.test_name || t.name))).join(', ')}</span>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Content Container: Diagnostic Reports & Imaging -->
      <div id="history-section-reports" style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <h4 style="font-size:1.1rem;font-weight:800;color:#0f172a;margin:0;">Diagnostic Test Reports &amp; Medical Scans</h4>
          <span class="badge" style="background:#e6f7f5;color:#0d9488;border:1px solid #99f6e4;font-size:0.75rem;font-weight:700;">
            ${reports.length} File${reports.length === 1 ? '' : 's'}
          </span>
        </div>

        ${reports.length === 0 ? `
          <div style="background:#ffffff;border:1px dashed #cbd5e1;border-radius:12px;padding:32px;text-align:center;color:#64748b;font-size:0.9rem;">
            No diagnostic reports or medical scans uploaded for this patient.
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px;">
            ${reports.map(r => {
              const ext = (r.file_url || '').split('.').pop().toUpperCase();
              return `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                  <div>
                    ${r.is_image ? `
                      <div style="position:relative;width:100%;height:160px;border-radius:10px;overflow:hidden;background:#f8fafc;margin-bottom:12px;border:1px solid #f1f5f9;cursor:pointer;" onclick="window.open('${r.file_url}', '_blank')">
                        <img src="${r.file_url}" alt="${escapeHtml(r.title)}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                        <span style="position:absolute;top:8px;right:8px;background:rgba(15,23,42,0.75);color:#ffffff;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:6px;backdrop-filter:blur(4px);">
                          ${ext || 'SCAN'}
                        </span>
                      </div>
                    ` : `
                      <div style="width:100%;height:100px;border-radius:10px;background:#f8fafc;margin-bottom:12px;border:1px solid #f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0d9488;">
                        <svg class="svg-icon svg-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style="font-size:0.75rem;font-weight:700;margin-top:4px;color:#475569;">${ext} Document</span>
                      </div>
                    `}

                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                      <span class="badge" style="background:#f0fdfa;color:#0d9488;border:1px solid #ccfbf1;font-size:0.72rem;font-weight:700;padding:2px 8px;">
                        ${escapeHtml(r.record_type ? r.record_type.replace(/_/g, ' ').toUpperCase() : 'REPORT')}
                      </span>
                      <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;">
                        ${formatDate(r.record_date || r.created_at)}
                      </span>
                    </div>

                    <h5 style="font-size:0.95rem;font-weight:800;color:#0f172a;margin:4px 0 6px 0;line-height:1.3;">
                      ${escapeHtml(r.title)}
                    </h5>

                    <div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;">
                      Uploaded by: <strong style="color:#334155;">${escapeHtml(r.uploader_name || r.facility_name)}</strong>
                    </div>

                    ${r.description ? `
                      <p style="font-size:0.78rem;color:#475569;background:#f8fafc;padding:8px 10px;border-radius:6px;border:1px solid #f1f5f9;margin:0 0 8px 0;line-height:1.4;">
                        ${escapeHtml(r.description)}
                      </p>
                    ` : ''}

                    ${r.tags && r.tags.length > 0 ? `
                      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">
                        ${r.tags.map(t => `<span style="font-size:0.68rem;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;">#${escapeHtml(t)}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>

                  <div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
                    <a href="${r.file_url}" target="_blank" class="btn btn-outline btn-sm" style="flex:1;text-align:center;font-size:0.78rem;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                      <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      Inspect Document
                    </a>
                    <a href="${r.file_url}" download class="btn btn-secondary btn-sm" style="font-size:0.78rem;text-decoration:none;padding:6px 10px;" title="Download File">
                      <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `<div style="text-align:center;padding:36px;color:#dc2626;">Error loading patient history: ${escapeHtml(error.message || 'Server error')}</div>`;
  }
}
window.viewPatientRecordsModal = viewPatientRecordsModal;

// Tab switcher for Patient History Modal
function switchHistoryTab(tab) {
  const consultSec = document.getElementById('history-section-consultations');
  const reportSec = document.getElementById('history-section-reports');
  const btnAll = document.getElementById('tab-btn-all');
  const btnConsults = document.getElementById('tab-btn-consults');
  const btnReports = document.getElementById('tab-btn-reports');

  if (!consultSec || !reportSec) return;

  const resetBtn = (btn) => {
    btn.style.background = 'transparent';
    btn.style.color = 'var(--text-main)';
    btn.classList.add('btn-outline');
  };
  const activeBtn = (btn) => {
    btn.style.background = '#0d9488';
    btn.style.color = '#ffffff';
    btn.classList.remove('btn-outline');
  };

  [btnAll, btnConsults, btnReports].forEach(b => { if (b) resetBtn(b); });

  if (tab === 'all') {
    consultSec.style.display = 'block';
    reportSec.style.display = 'block';
    if (btnAll) activeBtn(btnAll);
  } else if (tab === 'consults') {
    consultSec.style.display = 'block';
    reportSec.style.display = 'none';
    if (btnConsults) activeBtn(btnConsults);
  } else if (tab === 'reports') {
    consultSec.style.display = 'none';
    reportSec.style.display = 'block';
    if (btnReports) activeBtn(btnReports);
  }
}
window.switchHistoryTab = switchHistoryTab;

// Load Doctor Profile
async function loadDoctorProfile() {
  try {
    const res = await api.get('/doctor/profile');
    if (!res.success || !res.profile) return;

    const p = res.profile;
    document.getElementById('doc-name').value = p.name || '';
    document.getElementById('doc-email').value = p.email || '';

    const phoneInput = document.getElementById('doc-phone');
    if (phoneInput) {
      phoneInput.value = p.phone || '';
      updatePhoneDigitBadge(phoneInput.value);
    }

    const specSelect = document.getElementById('doc-specialty');
    const customGroup = document.getElementById('doc-specialty-custom-group');
    const customInput = document.getElementById('doc-specialty-custom');
    if (specSelect) {
      const currentSpec = p.specialty || 'General Medicine';
      const availableVals = Array.from(specSelect.options).map(o => o.value);
      if (availableVals.includes(currentSpec)) {
        specSelect.value = currentSpec;
        if (customGroup) customGroup.style.display = 'none';
      } else {
        specSelect.value = 'Other';
        if (customGroup) customGroup.style.display = 'block';
        if (customInput) customInput.value = currentSpec;
      }
    }
    document.getElementById('doc-qualifications').value = (p.qualifications || []).join(', ') || 'MBBS';
    document.getElementById('doc-experience').value = p.experience_years || 2;
    document.getElementById('doc-fee').value = p.consultation_fee || 500;
    document.getElementById('doc-bio').value = p.biography || '';
    document.getElementById('doc-start-time').value = p.start_time || '09:00';
    document.getElementById('doc-end-time').value = p.end_time || '17:00';
    document.getElementById('doc-clinic-name').value = p.clinic_name || 'VALORA Care Center';
    document.getElementById('doc-clinic-street').value = p.clinic_street || '';
    document.getElementById('doc-clinic-city').value = p.clinic_city || '';
    document.getElementById('doc-clinic-state').value = p.clinic_state || '';
    document.getElementById('doc-clinic-zip').value = p.clinic_postal_code || '';

    const licenseBadge = document.getElementById('profile-license-id');
    if (licenseBadge && p.license_number) {
      licenseBadge.textContent = p.license_number;
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Save Doctor Profile with Strict Range Validation
async function saveDoctorProfile(e) {
  e.preventDefault();

  const phoneRaw = document.getElementById('doc-phone').value.replace(/[^0-9]/g, '');
  if (phoneRaw.length < 9 || phoneRaw.length > 11) {
    showToast('Clinic phone number must contain between 9 and 11 digits.', 'error');
    return;
  }

  const expVal = parseInt(document.getElementById('doc-experience').value);
  if (isNaN(expVal) || expVal < 1 || expVal > 60) {
    showToast('Years of practice must be between 1 and 60.', 'error');
    return;
  }

  const feeVal = parseFloat(document.getElementById('doc-fee').value);
  if (isNaN(feeVal) || feeVal < 50 || feeVal > 50000) {
    showToast('Consultation fee must be between ₹50 and ₹50,000.', 'error');
    return;
  }

  const qualsRaw = document.getElementById('doc-qualifications').value;

  let specialty = document.getElementById('doc-specialty').value;
  if (specialty === 'Other') {
    const custom = (document.getElementById('doc-specialty-custom')?.value || '').trim();
    if (!custom) {
      showToast('Please enter your specific medical profession / specialty.', 'error');
      document.getElementById('doc-specialty-custom').focus();
      return;
    }
    specialty = custom;
  }

  const data = {
    name: document.getElementById('doc-name').value.trim(),
    phone: phoneRaw,
    specialty: specialty,
    qualifications: qualsRaw.split(',').map(q => q.trim()).filter(Boolean),
    experience_years: expVal,
    consultation_fee: feeVal,
    biography: document.getElementById('doc-bio').value.trim(),
    start_time: document.getElementById('doc-start-time').value,
    end_time: document.getElementById('doc-end-time').value,
    clinic_name: document.getElementById('doc-clinic-name').value.trim(),
    clinic_street: document.getElementById('doc-clinic-street').value.trim(),
    clinic_city: document.getElementById('doc-clinic-city').value.trim(),
    clinic_state: document.getElementById('doc-clinic-state').value.trim(),
    clinic_postal_code: document.getElementById('doc-clinic-zip').value.trim()
  };

  try {
    const res = await api.put('/doctor/profile', data);
    if (res.success) {
      showToast('Physician profile and clinic availability saved!', 'success');
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

function updatePhoneDigitBadge(val) {
  const badge = document.getElementById('phone-digit-indicator');
  if (!badge) return;
  const digits = String(val).replace(/[^0-9]/g, '');
  if (digits.length >= 9 && digits.length <= 11) {
    badge.innerHTML = `<span style="color:#059669;font-weight:700;font-size:0.75rem;">&check; ${digits.length}d</span>`;
  } else {
    badge.innerHTML = `<span style="color:#dc2626;font-size:0.75rem;">${digits.length}/11d</span>`;
  }
}

// Load Doctor Reviews & Patient Ratings
async function loadDoctorReviews() {
  const container = document.getElementById('reviews-list-container');
  if (!container) return;

  try {
    const user = getCurrentUser();
    if (!user) return;

    const res = await api.get(`/doctors/${user.id}/reviews`);
    if (!res.success) return;

    const titleEl = document.getElementById('reviews-header-title');
    const metaEl = document.getElementById('reviews-header-meta');
    const avgStatEl = document.getElementById('reviews-stat-avg');
    const totalStatEl = document.getElementById('reviews-stat-total');

    if (avgStatEl) {
      avgStatEl.textContent = `${res.average_rating || 5.0} / 5.0`;
    }
    if (totalStatEl) {
      totalStatEl.textContent = res.total_reviews || 0;
    }
    if (titleEl) {
      titleEl.textContent = `Patient Reviews & Ratings (${res.total_reviews || 0})`;
    }
    if (metaEl) {
      metaEl.innerHTML = `Average Rating: <strong>${res.average_rating || 5.0} / 5.0</strong> &bull; Verified patient consultations`;
    }

    if (!res.reviews || res.reviews.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:36px;color:#94a3b8;font-size:0.9rem;">No patient reviews recorded yet. Reviews will automatically appear once patients complete consultations.</div>`;
      return;
    }

    container.innerHTML = res.reviews.map(r => {
      const stars = '&#9733;'.repeat(r.rating) + '&#9734;'.repeat(5 - r.rating);
      return `
        <div class="review-bubble-card" style="margin-bottom:14px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:800;font-size:0.95rem;color:#0f172a;">${escapeHtml(r.patient_name)}</span>
              <span class="badge" style="background:#e6f7f5;color:#0d9488;font-weight:700;font-size:0.75rem;padding:3px 8px;border-radius:6px;">Verified Visit &bull; ${formatDate(r.appointment_date)}</span>
            </div>
            <div style="color:#f59e0b;font-size:1rem;letter-spacing:1px;">${stars}</div>
          </div>
          <div style="font-size:0.88rem;color:#475569;font-style:italic;line-height:1.5;">
            &ldquo;${escapeHtml(r.comment || 'Patient completed consultation with high satisfaction.')}&rdquo;
          </div>
          ${r.doctor_reply ? `
            <div class="official-reply-box" style="margin-top:10px;background:#f0fdf4;border-left:3px solid #10b981;padding:8px 12px;border-radius:4px;font-size:0.84rem;color:#166534;">
              <div style="font-weight:700;margin-bottom:2px;">Your Official Reply:</div>
              ${escapeHtml(r.doctor_reply)}
            </div>
          ` : `
            <div style="margin-top:10px;" id="reply-box-${r.id}">
              <button class="btn btn-outline btn-sm" onclick="showReplyComposer(${r.id})">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Reply to this review
              </button>
            </div>
          `}
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading doctor reviews:', error);
  }
}
window.loadDoctorReviews = loadDoctorReviews;

function showReplyComposer(reviewId) {
  const box = document.getElementById(`reply-box-${reviewId}`);
  if (!box) return;
  box.innerHTML = `
    <div style="display:flex;gap:8px;margin-top:8px;">
      <input type="text" id="reply-input-${reviewId}" class="form-control" style="font-size:0.85rem;" placeholder="Write official physician reply...">
      <button class="btn btn-primary btn-sm" onclick="submitReviewReply(${reviewId})">Send</button>
      <button class="btn btn-outline btn-sm" onclick="loadDoctorReviews()">Cancel</button>
    </div>
  `;
}
window.showReplyComposer = showReplyComposer;

async function submitReviewReply(reviewId) {
  const input = document.getElementById(`reply-input-${reviewId}`);
  const reply = input ? input.value.trim() : '';
  if (!reply) {
    showToast('Reply cannot be empty.', 'error');
    return;
  }
  try {
    const res = await api.post(`/reviews/${reviewId}/reply`, { reply });
    if (res.success) {
      showToast('Official reply posted successfully.', 'success');
      loadDoctorReviews();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.submitReviewReply = submitReviewReply;

// Universal Doctor Upload Record Modal Handlers
function openDoctorUploadModal(patientId, patientName) {
  const targetInput = document.getElementById('upload-target-patient-id');
  if (targetInput) targetInput.value = patientId;
  const nameEl = document.getElementById('upload-modal-patient-name');
  if (nameEl) nameEl.textContent = patientName || 'Patient';
  openModal('modal-upload-record');
}
window.openDoctorUploadModal = openDoctorUploadModal;

function updateSelectedFileName(input) {
  const display = document.getElementById('selected-file-display');
  if (!display) return;
  if (input.files && input.files.length > 0) {
    if (input.files.length === 1) {
      display.textContent = `Selected: ${input.files[0].name} (${(input.files[0].size/1024).toFixed(1)} KB)`;
    } else {
      const names = Array.from(input.files).map(f => f.name).join(', ');
      display.textContent = `Selected ${input.files.length} reports/images: ${names}`;
    }
  } else {
    display.textContent = '';
  }
}
window.updateSelectedFileName = updateSelectedFileName;

async function handleDoctorUploadRecord(e) {
  if (e) e.preventDefault();
  const patientId = document.getElementById('upload-target-patient-id')?.value;
  const fileInput = document.getElementById('rec-file-input');
  const title = (document.getElementById('rec-title')?.value || '').trim();
  const record_type = document.getElementById('rec-type')?.value || 'lab_report';
  const facility = (document.getElementById('rec-facility')?.value || 'VALORA Health Diagnostics').trim();
  const description = (document.getElementById('rec-summary')?.value || '').trim();
  const tags = (document.getElementById('rec-tags')?.value || '').trim();

  if (!title) {
    showToast('Record title is required.', 'error');
    return;
  }

  const formData = new FormData();
  if (patientId) formData.append('patient_id', patientId);
  formData.append('title', title);
  formData.append('record_type', record_type);
  formData.append('facility_name', facility);
  formData.append('facility_or_doctor', facility);
  formData.append('description', description);
  formData.append('tags', tags);

  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('files', fileInput.files[i]);
    }
    formData.append('file', fileInput.files[0]);
  }

  try {
    showToast('Encrypting and securing reports in vault...', 'info');
    const res = await api.upload('/records', formData);
    if (res.success) {
      closeModal('modal-upload-record');
      showToast(res.message || 'Diagnostic reports successfully uploaded and secured in patient vault!', 'success');
      const form = document.getElementById('upload-record-form');
      if (form) form.reset();
      const display = document.getElementById('selected-file-display');
      if (display) display.textContent = '';
      if (typeof loadDoctorPatients === 'function') loadDoctorPatients();
      if (typeof loadDoctorAppointments === 'function') loadDoctorAppointments();
      if (typeof loadDoctorDashboard === 'function') loadDoctorDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Failed to upload report.', 'error');
  }
}
window.handleDoctorUploadRecord = handleDoctorUploadRecord;

