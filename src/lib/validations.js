/**
 * Validation utilities for VALORA platform
 */

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password) {
  // At least 6 characters
  return typeof password === 'string' && password.length >= 6;
}

export function isValidPhone(phone) {
  if (!phone) return true; // optional
  const digitsOnly = phone.replace(/\D/g, '');
  // Must be between 9 and 15 digits
  return digitsOnly.length >= 9 && digitsOnly.length <= 15;
}

export const VALID_ROLES = ['patient', 'doctor', 'admin'];

export const RECORD_TYPES = [
  'lab_report',
  'xray',
  'mri_scan',
  'ct_scan',
  'ultrasound',
  'prescription',
  'discharge_summary',
  'other',
];

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'rescheduled',
];

export const APPOINTMENT_TYPES = [
  'in-person',
  'teleconsultation',
  'follow-up',
];

export const DOCTOR_SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Medicine',
  'Neurology',
  'Obstetrics & Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Urology',
];

