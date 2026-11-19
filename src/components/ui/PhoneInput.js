'use client';

import { useState, useEffect } from 'react';
import { Phone, Check, AlertCircle } from 'lucide-react';

export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
];

/**
 * Splits a full phone string (e.g., "+91 9876543210") into code and number.
 */
function parsePhone(rawPhone) {
  if (!rawPhone) return { countryCode: '+91', digits: '' };

  const trimmed = rawPhone.trim();
  const matched = COUNTRY_CODES.find((c) => trimmed.startsWith(c.code));
  if (matched) {
    const digits = trimmed.slice(matched.code.length).replace(/\D/g, '');
    return { countryCode: matched.code, digits };
  }

  // If starts with + but not in list
  if (trimmed.startsWith('+')) {
    const parts = trimmed.split(' ');
    const code = parts[0];
    const digits = parts.slice(1).join('').replace(/\D/g, '');
    return { countryCode: code, digits };
  }

  return { countryCode: '+91', digits: trimmed.replace(/\D/g, '') };
}

export default function PhoneInput({
  value = '',
  onChange,
  name = 'phone',
  id,
  required = false,
  label = 'Phone Number',
  placeholder = '98765 43210',
  className = '',
}) {
  const parsed = parsePhone(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [digits, setDigits] = useState(parsed.digits);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    const p = parsePhone(value);
    setCountryCode(p.countryCode);
    setDigits(p.digits);
  }, [value]);

  const handleCountryChange = (newCode) => {
    setCountryCode(newCode);
    const combined = digits ? `${newCode} ${digits}` : '';
    if (onChange) {
      onChange(combined, digits.length >= 9);
    }
  };

  const handleDigitsChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 15);
    setDigits(cleaned);
    setIsTouched(true);
    const combined = cleaned ? `${countryCode} ${cleaned}` : '';
    if (onChange) {
      onChange(combined, cleaned.length >= 9);
    }
  };

  const isTooShort = digits.length > 0 && digits.length < 9;
  const isValid = digits.length >= 9;
  const hasError = isTouched && (isTooShort || (required && digits.length === 0));

  const fullPhoneValue = digits ? `${countryCode} ${digits}` : '';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input ensures standard HTML form / FormData captures the combined phone */}
      <input type="hidden" name={name} value={fullPhoneValue} />

      <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all">
        {/* Compact Country Code Selector */}
        <div className="relative w-24 sm:w-28 shrink-0 border-r border-slate-200 bg-slate-50 flex items-center">
          <select
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full h-full pl-2.5 pr-6 py-2.5 bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none truncate"
            aria-label="Country Code"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.country})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 text-slate-400 text-xs">
            ▾
          </div>
        </div>

        {/* Large Expanded Number Input */}
        <div className="relative flex-1 min-w-0 flex items-center">
          <input
            id={id || name}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digits}
            onChange={handleDigitsChange}
            onBlur={() => setIsTouched(true)}
            required={required}
            minLength={9}
            maxLength={15}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />

          {isValid && (
            <div className="pr-3 text-emerald-600 flex items-center gap-1 shrink-0" title="Valid phone number">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[10px] font-bold hidden sm:inline">{digits.length}d</span>
            </div>
          )}
        </div>
      </div>

      {/* Validation Message */}
      {isTooShort && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Phone number must be at least 9 digits ({digits.length} entered)</span>
        </div>
      )}

      {isTouched && required && digits.length === 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Phone number is required</span>
        </div>
      )}
    </div>
  );
}
