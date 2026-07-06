import { DEFAULT_LOCATION } from '../constants/categories';
import { jitterCoords } from '../utils/distance';

const base = DEFAULT_LOCATION;

function loc(km = 1.5) {
  const c = jitterCoords(base.lat, base.lng, km);
  return { ...c, address: `${Math.round(km * 10) / 10} km from MG Road`, locality: base.locality };
}

export const SEED_WORKERS = [
  {
    id: 'w1', fullName: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com',
    gender: 'Male', age: 32, category: 'Home Services', specialization: 'Electrician',
    skills: 'Wiring, AC Repair, Switch Installation', experience: 8, expectedPay: '₹800/day',
    needWork: true, availability: 'available', verified: true, trustScore: 4.7, jobsCompleted: 45,
    location: loc(0.3), profilePhoto: null,
  },
  {
    id: 'w2', fullName: 'Priya Sharma', phone: '9876543211', email: 'priya@example.com',
    gender: 'Female', age: 28, category: 'Salon', specialization: 'Hair Stylist',
    skills: 'Haircut, Coloring, Styling', experience: 5, expectedPay: '₹18,000/month',
    needWork: true, availability: 'available', verified: true, trustScore: 4.9, jobsCompleted: 62,
    location: loc(1.2), profilePhoto: null,
  },
  {
    id: 'w3', fullName: 'Amit Desai', phone: '9876543212', email: 'amit@example.com',
    gender: 'Male', age: 35, category: 'Mechanic', specialization: 'Two-Wheeler Mechanic',
    skills: 'Bike Repair, Engine Tuning, Oil Change', experience: 10, expectedPay: '₹700/day',
    needWork: true, availability: 'available', verified: true, trustScore: 4.5, jobsCompleted: 38,
    location: loc(2.1), profilePhoto: null,
  },
  {
    id: 'w4', fullName: 'Suresh Reddy', phone: '9876543213', email: 'suresh@example.com',
    gender: 'Male', age: 40, category: 'Driver', specialization: 'Delivery Driver',
    skills: 'Food Delivery, Package Delivery, Navigation', experience: 12, expectedPay: '₹16,000/month',
    needWork: true, availability: 'available', verified: true, trustScore: 4.6, jobsCompleted: 89,
    location: loc(0.8), profilePhoto: null,
  },
  {
    id: 'w5', fullName: 'Meena Venkat', phone: '9876543214', email: 'meena@example.com',
    gender: 'Female', age: 30, category: 'Cafe', specialization: 'Cook',
    skills: 'South Indian, North Indian, Snacks', experience: 7, expectedPay: '₹15,000/month',
    needWork: true, availability: 'available', verified: true, trustScore: 4.8, jobsCompleted: 34,
    location: loc(1.5), profilePhoto: null,
  },
  {
    id: 'w6', fullName: 'Vikram Patel', phone: '9876543215', email: 'vikram@example.com',
    gender: 'Male', age: 26, category: 'Technology', specialization: 'Mobile Repair',
    skills: 'Screen Replacement, Software, Hardware', experience: 4, expectedPay: '₹600/day',
    needWork: true, availability: 'available', verified: false, trustScore: 4.3, jobsCompleted: 22,
    location: loc(3.5), profilePhoto: null,
  },
  {
    id: 'w7', fullName: 'Lakshmi Nair', phone: '9876543216', email: 'lakshmi@example.com',
    gender: 'Female', age: 24, category: 'Medical Shop', specialization: 'Pharmacist',
    skills: 'Medicine Dispensing, Billing, Inventory', experience: 3, expectedPay: '₹14,000/month',
    needWork: true, availability: 'available', verified: true, trustScore: 4.7, jobsCompleted: 15,
    location: loc(0.5), profilePhoto: null,
  },
  {
    id: 'w8', fullName: 'Ravi Singh', phone: '9876543217', email: 'ravi@example.com',
    gender: 'Male', age: 29, category: 'Grocery Shop', specialization: 'Stock Handler',
    skills: 'Stock Management, Billing, Customer Service', experience: 6, expectedPay: '₹13,000/month',
    needWork: false, availability: 'busy', verified: true, trustScore: 4.4, jobsCompleted: 28,
    location: loc(4.2), profilePhoto: null,
  },
];

export const SEED_BUSINESSES = [
  {
    id: 'b1', ownerName: 'Dr. Anil Mehta', businessName: 'City Medical Store',
    phone: '9988776655', email: 'contact@citymedical.com',
    category: 'Medical Shop', specialization: 'Pharmacist',
    requirement: 'Need experienced pharmacist for evening shift',
    needWorker: true, totalHires: 3, verified: true,
    location: loc(0.4),
  },
  {
    id: 'b2', ownerName: 'Sunita Rao', businessName: 'Fresh Mart Grocery',
    phone: '9988776656', email: 'hr@freshmart.com',
    category: 'Grocery Shop', specialization: 'Stock Handler',
    requirement: 'Stock handler and billing staff needed',
    needWorker: true, totalHires: 5, verified: true,
    location: loc(1.0),
  },
  {
    id: 'b3', ownerName: 'Karan Malhotra', businessName: 'Brew & Bite Cafe',
    phone: '9988776657', email: 'jobs@brewbite.com',
    category: 'Cafe', specialization: 'Cook',
    requirement: 'Part-time cook for breakfast and lunch',
    needWorker: true, totalHires: 2, verified: true,
    location: loc(1.8),
  },
  {
    id: 'b4', ownerName: 'Neha Gupta', businessName: 'Glamour Salon',
    phone: '9988776658', email: 'hire@glamoursalon.com',
    category: 'Salon', specialization: 'Hair Stylist',
    requirement: 'Experienced hair stylist for weekends',
    needWorker: true, totalHires: 1, verified: true,
    location: loc(2.5),
  },
  {
    id: 'b5', ownerName: 'Mohit Sharma', businessName: 'QuickFix Auto',
    phone: '9988776659', email: 'admin@quickfix.com',
    category: 'Mechanic', specialization: 'Two-Wheeler Mechanic',
    requirement: 'Urgent need for bike mechanic',
    needWorker: true, totalHires: 4, verified: true,
    location: loc(3.0),
  },
];

export const SEED_JOBS = [
  { id: 'j1', businessId: 'b1', title: 'Pharmacist - Evening Shift', category: 'Medical Shop', specialization: 'Pharmacist', pay: '₹16,000/month', jobType: 'part-time', urgent: false, requiredSkills: 'Medicine Dispensing, Billing', description: 'Evening shift pharmacist needed at City Medical Store.', status: 'active', location: loc(0.4) },
  { id: 'j2', businessId: 'b2', title: 'Stock Handler', category: 'Grocery Shop', specialization: 'Stock Handler', pay: '₹14,000/month', jobType: 'full-time', urgent: false, requiredSkills: 'Stock Management, Billing', description: 'Full-time stock handler for busy grocery store.', status: 'active', location: loc(1.0) },
  { id: 'j3', businessId: 'b3', title: 'Cafe Cook - Part Time', category: 'Cafe', specialization: 'Cook', pay: '₹12,000/month', jobType: 'part-time', urgent: false, requiredSkills: 'Cooking, South Indian', description: 'Cook needed for morning shift.', status: 'active', location: loc(1.8) },
  { id: 'j4', businessId: 'b4', title: 'Hair Stylist - Weekend', category: 'Salon', specialization: 'Hair Stylist', pay: '₹800/day', jobType: 'part-time', urgent: true, requiredSkills: 'Haircut, Styling', description: 'Weekend hair stylist urgently needed.', status: 'active', location: loc(2.5) },
  { id: 'j5', businessId: 'b5', title: 'Bike Mechanic - Urgent', category: 'Mechanic', specialization: 'Two-Wheeler Mechanic', pay: '₹900/day', jobType: 'urgent', urgent: true, requiredSkills: 'Bike Repair, Engine', description: 'Immediate opening for experienced mechanic.', status: 'active', location: loc(3.0) },
  { id: 'j6', businessId: 'b1', title: 'Delivery Boy', category: 'Medical Shop', specialization: 'Delivery Boy', pay: '₹12,000/month', jobType: 'full-time', urgent: false, requiredSkills: 'Delivery, Navigation', description: 'Medicine delivery within 5km radius.', status: 'active', location: loc(0.4) },
  { id: 'j7', businessId: 'b2', title: 'Cashier', category: 'Grocery Shop', specialization: 'Cashier', pay: '₹13,000/month', jobType: 'full-time', urgent: false, requiredSkills: 'Billing, Customer Service', description: 'Front desk cashier for grocery store.', status: 'active', location: loc(1.0) },
  { id: 'j8', businessId: 'b3', title: 'Barista', category: 'Cafe', specialization: 'Barista', pay: '₹11,000/month', jobType: 'full-time', urgent: false, requiredSkills: 'Coffee Making, Customer Service', description: 'Experienced barista for specialty coffee.', status: 'active', location: loc(1.8) },
  { id: 'j9', businessId: 'b5', title: 'Car Mechanic', category: 'Mechanic', specialization: 'Car Mechanic', pay: '₹20,000/month', jobType: 'full-time', urgent: false, requiredSkills: 'Car Repair, Diagnostics', description: 'Full-time car mechanic for auto shop.', status: 'active', location: loc(3.0) },
  { id: 'j10', businessId: 'b4', title: 'Beautician', category: 'Salon', specialization: 'Beautician', pay: '₹15,000/month', jobType: 'full-time', urgent: false, requiredSkills: 'Facial, Makeup, Threading', description: 'Full-time beautician for salon.', status: 'active', location: loc(2.5) },
  { id: 'j11', businessId: 'b2', title: 'Electrician Needed', category: 'Home Services', specialization: 'Electrician', pay: '₹850/day', jobType: 'one-time', urgent: true, requiredSkills: 'Wiring, AC Repair', description: 'Urgent electrical work for store renovation.', status: 'active', location: loc(1.0) },
];

export const SEED_REQUESTS = [
  { id: 'r1', type: 'worker_applied', senderId: 'w1', receiverId: 'b2', workerId: 'w1', businessId: 'b2', jobId: 'j2', status: 'pending', message: 'I have 8 years experience in stock management.', createdAt: '2026-07-05T10:30:00Z' },
  { id: 'r2', type: 'employer_invited', senderId: 'b4', receiverId: 'w2', workerId: 'w2', businessId: 'b4', jobId: 'j4', status: 'pending', message: 'We would love to have you for weekend shifts!', createdAt: '2026-07-05T14:00:00Z' },
  { id: 'r3', type: 'worker_applied', senderId: 'w5', receiverId: 'b3', workerId: 'w5', businessId: 'b3', jobId: 'j3', status: 'accepted', message: 'Experienced in South Indian cooking.', createdAt: '2026-07-04T09:00:00Z' },
  { id: 'r4', type: 'employer_invited', senderId: 'b5', receiverId: 'w3', workerId: 'w3', businessId: 'b5', jobId: 'j5', status: 'accepted', message: 'Your profile matches our urgent requirement.', createdAt: '2026-07-03T16:00:00Z' },
  { id: 'r5', type: 'worker_applied', senderId: 'w7', receiverId: 'b1', workerId: 'w7', businessId: 'b1', jobId: 'j1', status: 'rejected', message: 'Licensed pharmacist with 3 years experience.', createdAt: '2026-07-02T11:00:00Z' },
];

export function getSeedData() {
  return {
    workers: SEED_WORKERS,
    businesses: SEED_BUSINESSES,
    jobs: SEED_JOBS,
    requests: SEED_REQUESTS,
  };
}
