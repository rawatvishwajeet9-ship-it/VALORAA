'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { registerUser } from '@/actions/authActions';
import { Activity, Stethoscope, HeartPulse, AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { DOCTOR_SPECIALTIES } from '@/lib/validations';
import PhoneInput from '@/components/ui/PhoneInput';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = searchParams.get('role') === 'doctor' ? 'doctor' : 'patient';
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('+91 ');
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  // Patient fields
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState('male');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Doctor fields
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [consultationFee, setConsultationFee] = useState('600');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'doctor' || r === 'patient') {
      setRole(r);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Phone validation: if provided, must have at least 9 digits
    if (phone) {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length > 0 && digitsOnly.length < 9) {
        setError('Phone number must contain at least 9 digits.');
        setIsSubmitting(false);
        return;
      }
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    if (role === 'doctor') {
      const fee = Number(consultationFee);
      if (isNaN(fee) || fee < 500) {
        setError('Consultation fee must be a minimum of ₹500. A fee of ₹0 is not valid.');
        setIsSubmitting(false);
        return;
      }
      const exp = Number(experienceYears);
      if (isNaN(exp) || exp < 1) {
        setError('Years of experience cannot be 0. As a certified medical doctor, clinical experience must be at least 1 year.');
        setIsSubmitting(false);
        return;
      }
      if (!licenseNumber || licenseNumber.trim() === '') {
        setError('Medical License / MCI Number is required for physician registration.');
        setIsSubmitting(false);
        return;
      }
    }

    if (role === 'patient' && dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      if (isNaN(dobDate.getTime()) || dobDate > today) {
        setError('Date of birth cannot be in the future.');
        setIsSubmitting(false);
        return;
      }
      if (dobDate.getFullYear() < 1900) {
        setError('Please enter a valid year of birth after 1900.');
        setIsSubmitting(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('role', role);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('phone', phone);

    if (role === 'patient') {
      formData.append('bloodGroup', bloodGroup);
      formData.append('gender', gender);
      if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
    } else {
      formData.append('specialty', specialty);
      formData.append('licenseNumber', licenseNumber);
      formData.append('experienceYears', experienceYears);
      formData.append('consultationFee', consultationFee);
    }

    const res = await registerUser(formData);

    if (res.success) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('valora_remembered_login', JSON.stringify({ email, portal: role, name }));
          const existing = JSON.parse(localStorage.getItem('valora_saved_accounts') || '[]');
          const updated = [{ email, name, role, lastUsed: Date.now() }, ...existing.filter((a) => a.email !== email)].slice(0, 5);
          localStorage.setItem('valora_saved_accounts', JSON.stringify(updated));
        } catch (e) {}
      }
      const destination = role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
      window.location.href = destination;
    } else {
      setError(res.error || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 items-center justify-center shadow-lg shadow-teal-500/20 mb-2">
          <Activity className="w-7 h-7 text-white stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create VALORA Account</h2>
        <p className="text-xs text-slate-500">Choose your account type to register on the platform</p>
      </div>

      {/* Role Switcher Tabs */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/60 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setRole('patient');
            setError('');
          }}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
            role === 'patient'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>I am a Patient / Customer</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setRole('doctor');
            setError('');
          }}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
            role === 'doctor'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>I am a Physician / Doctor</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        method="POST"
        action="#"
        autoComplete="on"
        className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm"
      >
        {/* Name and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'doctor' ? 'Dr. Sarah Jenkins' : 'Jane Doe'}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <PhoneInput
              label="Phone Number"
              value={phone}
              onChange={(val, valid) => {
                setPhone(val);
                setIsPhoneValid(valid);
              }}
              name="phone"
              placeholder="98765 43210"
            />
          </div>
        </div>

        {/* Email and Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Patient Specific Fields */}
        {role === 'patient' && (
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">
              Health & Vital Profile
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Doctor Specific Fields */}
        {role === 'doctor' && (
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Professional Credentials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Medical Specialty *</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {DOCTOR_SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Medical License / MCI No. *</label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MCI-MED-74892"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-700 font-semibold">Years of Experience *</label>
                  <span className="text-[10px] text-slate-400">Min. 1 year</span>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max="65"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    Number(experienceYears) < 1
                      ? 'border-rose-400 bg-rose-50/50 text-rose-800 ring-2 ring-rose-200'
                      : 'border-slate-200'
                  }`}
                  placeholder="e.g. 5"
                />
                {Number(experienceYears) < 1 && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Experience cannot be 0. Certified physicians must have at least 1 year.</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-700 font-semibold">Consultation Fee (₹) *</label>
                  <span className="text-[10px] text-slate-400">Min. ₹500</span>
                </div>
                <input
                  type="number"
                  required
                  min="500"
                  step="50"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    Number(consultationFee) < 500
                      ? 'border-rose-400 bg-rose-50/50 text-rose-800 ring-2 ring-rose-200'
                      : 'border-slate-200'
                  }`}
                  placeholder="Min 500"
                />
                {Number(consultationFee) < 500 && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Fee cannot be 0. Minimum consultation fee must be ₹500.</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-4 py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Creating Account...' : (
            <>
              <span>Register as {role === 'doctor' ? 'Doctor' : 'Patient'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              href={role === 'doctor' ? '/login?portal=doctor' : '/login?portal=patient'}
              className="font-bold text-teal-600 hover:text-teal-700"
            >
              Log In
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
