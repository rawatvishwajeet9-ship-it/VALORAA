'use client';

import { useState, useRef } from 'react';
import { updateDoctorProfile } from '@/actions/doctorActions';
import { DOCTOR_SPECIALTIES } from '@/lib/validations';
import { Save, CheckCircle, AlertCircle, ShieldCheck, Camera, Upload, Trash2 } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';

export default function DoctorProfileForm({ initialUser, initialProfile }) {
  const fileInputRef = useRef(null);

  const [name, setName] = useState(initialUser.name || '');
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [email] = useState(initialUser.email || '');
  const [avatar, setAvatar] = useState(initialUser.avatar || '');

  const [specialty, setSpecialty] = useState(initialProfile.specialty || 'General Medicine');
  const [qualifications, setQualifications] = useState(
    initialProfile.qualifications ? initialProfile.qualifications.join(', ') : 'MBBS'
  );
  const [experienceYears, setExperienceYears] = useState(initialProfile.experienceYears || 5);
  const [consultationFee, setConsultationFee] = useState(initialProfile.consultationFee || 600);
  const [biography, setBiography] = useState(initialProfile.biography || '');

  const [clinicName, setClinicName] = useState(initialProfile.clinicAddress?.clinicName || 'VALORA Care Center');
  const [street, setStreet] = useState(initialProfile.clinicAddress?.street || '');
  const [city, setCity] = useState(initialProfile.clinicAddress?.city || '');
  const [state, setState] = useState(initialProfile.clinicAddress?.state || '');
  const [postalCode, setPostalCode] = useState(initialProfile.clinicAddress?.postalCode || '');

  const [startHour, setStartHour] = useState(initialProfile.availableHours?.start || '09:00');
  const [endHour, setEndHour] = useState(initialProfile.availableHours?.end || '17:00');
  const [availableDays, setAvailableDays] = useState(
    initialProfile.availableDays ? initialProfile.availableDays.join(', ') : 'Monday, Tuesday, Wednesday, Thursday, Friday'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Image file size must be less than 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
      setMessage('Profile photo selected. Click "Save Doctor Profile" below to apply.');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setMessage('Profile photo removed. Click "Save Doctor Profile" to confirm.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 9) {
        setError('Phone number must contain at least 9 digits.');
        setIsSubmitting(false);
        return;
      }
    }

    const fee = Number(consultationFee);
    if (isNaN(fee) || fee < 500) {
      setError('Consultation fee must be a minimum of ₹500. A fee of ₹0 is not valid.');
      setIsSubmitting(false);
      return;
    }

    const exp = Number(experienceYears);
    if (isNaN(exp) || exp < 1) {
      setError('Years of experience cannot be 0. Certified physicians must have at least 1 year of clinical experience.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('avatar', avatar);
    formData.append('specialty', specialty);
    formData.append('qualifications', qualifications);
    formData.append('experienceYears', experienceYears);
    formData.append('consultationFee', consultationFee);
    formData.append('biography', biography);
    formData.append('clinicName', clinicName);
    formData.append('street', street);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('postalCode', postalCode);
    formData.append('startHour', startHour);
    formData.append('endHour', endHour);
    formData.append('availableDays', availableDays);

    const res = await updateDoctorProfile(formData);

    if (res.success) {
      setMessage('Doctor profile & clinical availability updated! Reloading view...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      setError(res.error || 'Failed to update doctor profile');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Status Banner */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              License ID: <span className="font-mono">{initialProfile.licenseNumber}</span>
            </p>
            <p className="text-xs text-slate-500">
              Platform Verification:{' '}
              <span className="text-emerald-600 font-bold">Verified Medical Practitioner • Active</span>
            </p>
          </div>
        </div>
      </div>

      {/* Basic & Specialty */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. Physician Details & Profile Photo
        </h3>

        {/* Doctor Photo Section */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 overflow-hidden flex items-center justify-center text-emerald-800 font-black text-2xl shadow-sm">
              {avatar ? (
                <img src={avatar} alt="Doctor Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{name ? name.charAt(0).toUpperCase() : 'D'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-colors"
              title="Upload photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-slate-800">Physician Profile Photo</p>
              <p className="text-[11px] text-slate-500">
                Shown to patients on your directory card, appointments queue, and in the top navigation bar.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Doctor Photo</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <PhoneInput
              label="Clinic Phone"
              value={phone}
              onChange={(val) => setPhone(val)}
              name="phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Specialty</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {DOCTOR_SPECIALTIES.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Qualifications</label>
            <input
              type="text"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="MBBS, MD, MS (comma separated)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Years of Practice (Min. 1)</label>
            <input
              type="number"
              min="1"
              max="65"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Professional Bio</label>
          <textarea
            rows={3}
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            placeholder="Clinical background, sub-specializations, hospital affiliations..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
      </div>

      {/* OPD Schedule & Pricing */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          2. OPD Scheduling & Consultation Fee
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Consultation Fee (₹, Min 500)</label>
            <input
              type="number"
              min="500"
              step="50"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time</label>
            <input
              type="time"
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">End Time</label>
            <input
              type="time"
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Operating Days</label>
            <input
              type="text"
              value={availableDays}
              onChange={(e) => setAvailableDays(e.target.value)}
              placeholder="Mon, Tue, Wed..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Clinic Location */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          3. Clinic Location & Hospital Address
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Clinic Name</label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Street Address</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Updating Profile...' : 'Save Physician Profile'}</span>
        </button>
      </div>
    </form>
  );
}

