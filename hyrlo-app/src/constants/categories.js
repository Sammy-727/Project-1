export const CATEGORIES = [
  'Medical Shop',
  'Grocery Shop',
  'Cafe',
  'Salon',
  'Driver',
  'Mechanic',
  'Home Services',
  'Technology',
];

export const SPECIALIZATIONS = {
  'Medical Shop': ['Pharmacist', 'Store Assistant', 'Billing Staff', 'Delivery Boy'],
  'Grocery Shop': ['Cashier', 'Stock Handler', 'Delivery Staff', 'Shop Helper'],
  'Cafe': ['Barista', 'Waiter', 'Cook', 'Cashier', 'Kitchen Helper'],
  'Salon': ['Hair Stylist', 'Beautician', 'Receptionist', 'Spa Therapist'],
  'Driver': ['Personal Driver', 'Delivery Driver', 'Cab Driver', 'Truck Driver'],
  'Mechanic': ['Two-Wheeler Mechanic', 'Car Mechanic', 'AC Mechanic', 'General Mechanic'],
  'Home Services': ['Electrician', 'Plumber', 'Cleaner', 'Cook', 'Helper', 'Painter'],
  'Technology': ['Computer Technician', 'Mobile Repair', 'IT Support', 'CCTV Installer'],
};

export const RELATED_CATEGORIES = {
  'Medical Shop': ['Grocery Shop', 'Driver'],
  'Grocery Shop': ['Medical Shop', 'Driver', 'Home Services'],
  'Cafe': ['Grocery Shop', 'Home Services'],
  'Salon': ['Home Services'],
  'Driver': ['Grocery Shop', 'Medical Shop', 'Mechanic'],
  'Mechanic': ['Driver', 'Technology', 'Home Services'],
  'Home Services': ['Mechanic', 'Technology', 'Salon'],
  'Technology': ['Mechanic', 'Home Services'],
};

export const JOB_TYPES = ['full-time', 'part-time', 'one-time', 'urgent'];

export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

export const REQUEST_TYPES = {
  WORKER_APPLIED: 'worker_applied',
  EMPLOYER_INVITED: 'employer_invited',
};

export const MAX_DISTANCE_KM = 12;

export const DEFAULT_LOCATION = {
  lat: 12.9716,
  lng: 77.5946,
  address: 'MG Road, Bangalore',
  locality: 'Central Bangalore',
};
