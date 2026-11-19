'use server';

import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import Doctor from '@/models/Doctor';
import Appointment from '@/models/Appointment';
import MedicalRecord from '@/models/MedicalRecord';
import Consultation from '@/models/Consultation';
import Prescription from '@/models/Prescription';
import DoctorPatientAccess from '@/models/DoctorPatientAccess';
import AuditLog from '@/models/AuditLog';
import { requireAuth, requireRole, setSessionCookie } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get comprehensive patient dashboard overview
 */
export async function getPatientDashboardData() {
  try {
    const session = await requireRole('patient');
    await connectDB();

    let patientUser = await User.findById(session.id).select('-passwordHash').lean();
    if (!patientUser && session.email) {
      patientUser = await User.findOne({ email: session.email }).select('-passwordHash').lean();
    }
    if (!patientUser) {
      await clearSessionCookie();
      return { success: false, error: 'Session expired or patient record not found. Please log in again.' };
    }

    let patientProfile = await Patient.findOne({ userId: patientUser._id }).lean();
    if (!patientProfile) {
      const created = await Patient.create({
        userId: patientUser._id,
        bloodGroup: 'Unknown',
        gender: 'prefer_not_to_say',
      });
      patientProfile = created.toObject();
    }

    // Fetch upcoming appointments
    const upcomingAppointments = await Appointment.find({
      patientId: session.id,
      appointmentDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .populate('doctorId', 'name email phone avatar')
      .sort({ appointmentDate: 1 })
      .limit(5)
      .lean();

    // Fetch recent medical records
    const recentRecords = await MedicalRecord.find({ patientId: session.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Fetch recent prescriptions
    const recentPrescriptions = await Prescription.find({ patientId: session.id })
      .populate('doctorId', 'name')
      .sort({ prescribedDate: -1 })
      .limit(3)
      .lean();

    // Fetch latest consultation
    const latestConsultation = await Consultation.findOne({ patientId: session.id })
      .populate('doctorId', 'name')
      .sort({ consultationDate: -1 })
      .lean();

    // Quick stats
    const totalRecords = await MedicalRecord.countDocuments({ patientId: session.id });
    const totalAppointments = await Appointment.countDocuments({ patientId: session.id });
    const totalPrescriptions = await Prescription.countDocuments({ patientId: session.id });

    return {
      success: true,
      data: {
        user: JSON.parse(JSON.stringify(patientUser)),
        profile: JSON.parse(JSON.stringify(patientProfile || {})),
        upcomingAppointments: JSON.parse(JSON.stringify(upcomingAppointments)),
        recentRecords: JSON.parse(JSON.stringify(recentRecords)),
        recentPrescriptions: JSON.parse(JSON.stringify(recentPrescriptions)),
        latestConsultation: JSON.parse(JSON.stringify(latestConsultation || null)),
        stats: {
          totalRecords,
          totalAppointments,
          totalPrescriptions,
        },
      },
    };
  } catch (error) {
    console.error('getPatientDashboardData error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Patient profile details
 */
export async function getPatientProfile() {
  try {
    const session = await requireRole('patient');
    await connectDB();

    const user = await User.findById(session.id).select('-passwordHash').lean();
    let profile = await Patient.findOne({ userId: session.id }).lean();

    if (!profile) {
      profile = await Patient.create({ userId: session.id });
    }

    return {
      success: true,
      user: JSON.parse(JSON.stringify(user)),
      profile: JSON.parse(JSON.stringify(profile)),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update Patient Profile
 */
export async function updatePatientProfile(formData) {
  try {
    const session = await requireRole('patient');
    await connectDB();

    const name = formData.get('name')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const avatar = formData.get('avatar')?.toString();
    const dateOfBirth = formData.get('dateOfBirth')?.toString();
    const gender = formData.get('gender')?.toString();
    const bloodGroup = formData.get('bloodGroup')?.toString();
    const allergiesRaw = formData.get('allergies')?.toString();
    const chronicRaw = formData.get('chronicConditions')?.toString();
    const heightCm = formData.get('heightCm') ? Number(formData.get('heightCm')) : null;
    const weightKg = formData.get('weightKg') ? Number(formData.get('weightKg')) : null;

    // Validate Height
    if (heightCm !== null && !isNaN(heightCm)) {
      if (heightCm < 30 || heightCm > 260) {
        return { success: false, error: 'Height must be a valid number between 30 cm and 260 cm' };
      }
    }

    // Validate Weight
    if (weightKg !== null && !isNaN(weightKg)) {
      if (weightKg < 2 || weightKg > 400) {
        return { success: false, error: 'Weight must be a valid number between 2 kg and 400 kg' };
      }
    }

    // Validate Date of Birth
    let parsedDob = undefined;
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      const now = new Date();
      if (isNaN(dobDate.getTime()) || dobDate > now) {
        return { success: false, error: 'Date of birth cannot be in the future' };
      }
      if (dobDate.getFullYear() < 1900) {
        return { success: false, error: 'Please enter a valid birth year after 1900' };
      }
      parsedDob = dobDate;
    }

    const emergencyName = formData.get('emergencyName')?.toString().trim();
    const emergencyRelation = formData.get('emergencyRelation')?.toString().trim();
    const emergencyPhone = formData.get('emergencyPhone')?.toString().trim();

    const street = formData.get('street')?.toString().trim();
    const city = formData.get('city')?.toString().trim();
    const state = formData.get('state')?.toString().trim();
    const postalCode = formData.get('postalCode')?.toString().trim();
    const insuranceProvider = formData.get('insuranceProvider')?.toString().trim();
    const insurancePolicyNumber = formData.get('insurancePolicyNumber')?.toString().trim();

    // Update User basic info and avatar
    const userUpdates = { name, phone };
    if (avatar !== undefined) {
      userUpdates.avatar = avatar;
    }
    const updatedUser = await User.findByIdAndUpdate(session.id, userUpdates, { new: true });
    if (updatedUser) {
      await setSessionCookie(updatedUser);
    }

    // Update Patient profile info
    const allergies = allergiesRaw ? allergiesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const chronicConditions = chronicRaw ? chronicRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

    await Patient.findOneAndUpdate(
      { userId: session.id },
      {
        dateOfBirth: parsedDob,
        gender,
        bloodGroup,
        allergies,
        chronicConditions,
        heightCm,
        weightKg,
        emergencyContact: {
          name: emergencyName || '',
          relation: emergencyRelation || '',
          phone: emergencyPhone || '',
        },
        address: {
          street: street || '',
          city: city || '',
          state: state || '',
          postalCode: postalCode || '',
          country: 'India',
        },
        insuranceProvider: insuranceProvider || '',
        insurancePolicyNumber: insurancePolicyNumber || '',
      },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      userId: session.id,
      action: 'PATIENT_PROFILE_UPDATED',
      entityType: 'Patient',
      entityId: session.id,
    });

    revalidatePath('/patient/profile');
    revalidatePath('/patient/dashboard');

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('updatePatientProfile error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * View complete chronological medical history for patient
 */
export async function getPatientHistory() {
  try {
    const session = await requireRole(['patient', 'doctor', 'admin']);
    await connectDB();

    let targetPatientId = session.id;

    // Doctor can view if they have access
    // Admin can view any
    const appointments = await Appointment.find({ patientId: targetPatientId })
      .populate('doctorId', 'name email')
      .sort({ appointmentDate: -1 })
      .lean();

    const consultations = await Consultation.find({ patientId: targetPatientId })
      .populate('doctorId', 'name')
      .populate('appointmentId')
      .sort({ consultationDate: -1 })
      .lean();

    const prescriptions = await Prescription.find({ patientId: targetPatientId })
      .populate('doctorId', 'name')
      .sort({ prescribedDate: -1 })
      .lean();

    const records = await MedicalRecord.find({ patientId: targetPatientId })
      .populate('uploadedBy', 'name role')
      .sort({ recordDate: -1 })
      .lean();

    return {
      success: true,
      data: {
        appointments: JSON.parse(JSON.stringify(appointments)),
        consultations: JSON.parse(JSON.stringify(consultations)),
        prescriptions: JSON.parse(JSON.stringify(prescriptions)),
        records: JSON.parse(JSON.stringify(records)),
      },
    };
  } catch (error) {
    console.error('getPatientHistory error:', error);
    return { success: false, error: error.message };
  }
}

