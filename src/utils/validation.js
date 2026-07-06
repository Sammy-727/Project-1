export function validatePhone(phone) {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (!cleaned) return 'Phone number is required';
  if (cleaned.length !== 10) return 'Phone number must be 10 digits';
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value || !String(value).trim()) return `${fieldName} is required`;
  return null;
}

export function validateAge(age) {
  const num = parseInt(age, 10);
  if (!age) return 'Age is required';
  if (isNaN(num) || num < 16 || num > 70) return 'Age must be between 16 and 70';
  return null;
}

export function validateEmail(email) {
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
  return null;
}

export function validateWorkerBasic(data) {
  const errors = {};
  const nameErr = validateRequired(data.fullName, 'Full name');
  if (nameErr) errors.fullName = nameErr;
  const phoneErr = validatePhone(data.phone);
  if (phoneErr) errors.phone = phoneErr;
  const ageErr = validateAge(data.age);
  if (ageErr) errors.age = ageErr;
  if (!data.gender) errors.gender = 'Gender is required';
  if (!data.termsAccepted) errors.termsAccepted = 'You must accept Terms & Conditions';
  return errors;
}

export function validateWorkerWork(data) {
  const errors = {};
  if (!data.category) errors.category = 'Category is required';
  if (!data.specialization) errors.specialization = 'Specialization is required';
  const skillsErr = validateRequired(data.skills, 'Skills');
  if (skillsErr) errors.skills = skillsErr;
  if (!data.experience && data.experience !== 0) errors.experience = 'Experience is required';
  const payErr = validateRequired(data.expectedPay, 'Expected pay');
  if (payErr) errors.expectedPay = payErr;
  return errors;
}

export function validateWorkerLocation(data) {
  const errors = {};
  const locErr = validateRequired(data.locality || data.address, 'Location');
  if (locErr) errors.location = locErr;
  return errors;
}

export function validateEmployerOwner(data) {
  const errors = {};
  const nameErr = validateRequired(data.ownerName, 'Owner name');
  if (nameErr) errors.ownerName = nameErr;
  const phoneErr = validatePhone(data.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (!data.termsAccepted) errors.termsAccepted = 'You must accept Terms & Conditions';
  return errors;
}

export function validateEmployerBusiness(data) {
  const errors = {};
  const bizErr = validateRequired(data.businessName, 'Business name');
  if (bizErr) errors.businessName = bizErr;
  if (!data.category) errors.category = 'Category is required';
  if (!data.specialization) errors.specialization = 'Specialization is required';
  const locErr = validateRequired(data.locality || data.address, 'Location');
  if (locErr) errors.location = locErr;
  return errors;
}

export function validateEmployerRequirement(data) {
  const errors = {};
  const reqErr = validateRequired(data.requirement, 'Worker requirement');
  if (reqErr) errors.requirement = reqErr;
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
