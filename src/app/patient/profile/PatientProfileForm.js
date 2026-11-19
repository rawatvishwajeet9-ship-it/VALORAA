'use client';

import { useState, useRef } from 'react';
import { updatePatientProfile } from '@/actions/patientActions';
import { Save, CheckCircle, AlertCircle, Camera, Upload, Trash2, User } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';

export default function PatientProfileForm({ initialUser, initialProfile }) {
  const fileInputRef = useRef(null);

  const [name, setName] = useState(initialUser.name || '');
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [email] = useState(initialUser.email || '');
  const [avatar, setAvatar] = useState(initialUser.avatar || '');

  const [gender, setGender] = useState(initialProfile.gender || 'male');
  const [bloodGroup, setBloodGroup] = useState(initialProfile.bloodGroup || 'O+');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialProfile.dateOfBirth ? new Date(initialProfile.dateOfBirth).toISOString().split('T')[0] : ''
  );
  const [heightCm, setHeightCm] = useState(initialProfile.heightCm || '');
  const [weightKg, setWeightKg] = useState(initialProfile.weightKg || '');

  const [allergies, setAllergies] = useState(
    initialProfile.allergies ? initialProfile.allergies.join(', ') : ''
  );
  const [chronicConditions, setChronicConditions] = useState(
    initialProfile.chronicConditions ? initialProfile.chronicConditions.join(', ') : ''
  );

  const [emergencyName, setEmergencyName] = useState(initialProfile.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(initialProfile.emergencyContact?.relation || '');
  const [emergencyPhone, setEmergencyPhone] = useState(initialProfile.emergencyContact?.phone || '');

  const [street, setStreet] = useState(initialProfile.address?.street || '');
  const [city, setCity] = useState(initialProfile.address?.city || '');
  const [state, setState] = useState(initialProfile.address?.state || '');
  const [postalCode, setPostalCode] = useState(initialProfile.address?.postalCode || '');

  const [insuranceProvider, setInsuranceProvider] = useState(initialProfile.insuranceProvider || '');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(initialProfile.insurancePolicyNumber || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Max DOB is today - no future dates allowed
  const todayStr = new Date().toISOString().split('T')[0];

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
      setMessage('Profile image selected. Remember to click "Save Profile Changes" below.');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setMessage('Profile photo removed. Click "Save Profile Changes" to confirm.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    // Phone validation
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 9) {
        setError('Phone number must contain at least 9 digits.');
        setIsSubmitting(false);
        return;
      }
    }

    if (emergencyPhone) {
      const eDigits = emergencyPhone.replace(/\D/g, '');
      if (eDigits.length > 0 && eDigits.length < 9) {
        setError('Emergency contact phone must contain at least 9 digits.');
        setIsSubmitting(false);
        return;
      }
    }

    // Date of birth validation: Cannot be future date, must be after 1900
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      const now = new Date();
      if (isNaN(dobDate.getTime()) || dobDate > now) {
        setError('Date of birth cannot be in the future.');
        setIsSubmitting(false);
        return;
      }
      if (dobDate.getFullYear() < 1900) {
        setError('Please enter a valid birth year after 1900.');
        setIsSubmitting(false);
        return;
      }
    }

    // Height validation: Must be realistic positive number
    if (heightCm) {
      const h = Number(heightCm);
      if (isNaN(h) || h < 30 || h > 260) {
        setError('Please enter a valid positive height between 30 cm and 260 cm.');
        setIsSubmitting(false);
        return;
      }
    }

    // Weight validation: Must be realistic positive number
    if (weightKg) {
      const w = Number(weightKg);
      if (isNaN(w) || w < 2 || w > 400) {
        setError('Please enter a valid positive weight between 2 kg and 400 kg.');
        setIsSubmitting(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('avatar', avatar);
    formData.append('gender', gender);
    formData.append('bloodGroup', bloodGroup);
    formData.append('dateOfBirth', dateOfBirth);
    formData.append('heightCm', heightCm);
    formData.append('weightKg', weightKg);
    formData.append('allergies', allergies);
    formData.append('chronicConditions', chronicConditions);
    formData.append('emergencyName', emergencyName);
    formData.append('emergencyRelation', emergencyRelation);
    formData.append('emergencyPhone', emergencyPhone);
    formData.append('street', street);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('postalCode', postalCode);
    formData.append('insuranceProvider', insuranceProvider);
    formData.append('insurancePolicyNumber', insurancePolicyNumber);

    const res = await updatePatientProfile(formData);

    if (res.success) {
      setMessage('Profile parameters successfully updated! Reloading view...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      setError(res.error || 'Failed to update profile');
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

      {/* 1. Identity & Profile Photo */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. Identity & Profile Photo
        </h3>

        {/* Profile Picture Upload Section */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full bg-teal-100 border-2 border-teal-300 overflow-hidden flex items-center justify-center text-teal-800 font-black text-2xl shadow-sm">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{name ? name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 shadow-md transition-colors"
              title="Upload photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-slate-800">Profile Picture / Avatar</p>
              <p className="text-[11px] text-slate-500">
                Upload a photo to show on your medical chart and top navigation bar. PNG, JPG or WEBP (Max 3MB).
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
                <span>Upload Custom Image</span>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email (Account Primary)</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <PhoneInput
              label="Phone Number"
              value={phone}
              onChange={(val) => setPhone(val)}
              name="phone"
            />
          </div>
        </div>
      </div>

      {/* 2. Clinical Vitals & Parameters */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          2. Clinical Baseline & Physiological Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
            <input
              type="date"
              max={todayStr}
              min="1900-01-01"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Height (cm)</label>
            <input
              type="number"
              min="30"
              max="260"
              step="1"
              placeholder="e.g. 175"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (kg)</label>
            <input
              type="number"
              min="2"
              max="400"
              step="0.5"
              placeholder="e.g. 70"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Known Drug / Environmental Allergies
            </label>
            <input
              type="text"
              placeholder="e.g. Penicillin, Peanuts, Sulfa (comma separated)"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pre-existing Chronic Conditions
            </label>
            <input
              type="text"
              placeholder="e.g. Type 2 Diabetes, Mild Asthma (comma separated)"
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Emergency Contact & Insurance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            3. Emergency Contact Person
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Contact Name</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Relative or guardian name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Relationship</label>
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="Spouse / Parent / Sibling"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <PhoneInput
                  label="Phone Number"
                  value={emergencyPhone}
                  onChange={(val) => setEmergencyPhone(val)}
                  name="emergencyPhone"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            4. Medical Insurance Coverage
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Insurance Provider</label>
              <input
                type="text"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                placeholder="e.g. Star Health, HDFC ERGO, Care Health"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Policy / Member ID Number</label>
              <input
                type="text"
                value={insurancePolicyNumber}
                onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                placeholder="e.g. POL-89304910"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Residential Address */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          5. Residential Address
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Street Address</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="e.g. 42 Park Avenue, Apartment 3B"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">State / Province</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Postal / PIN Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="e.g. 400001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.01]"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving Profile...' : 'Save Profile Changes'}</span>
        </button>
      </div>
    </form>
  );
}
