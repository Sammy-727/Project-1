import { getSeedData } from '../data/seedData';
import { REQUEST_TYPES } from '../constants/categories';
import * as api from './api';

const KEYS = {
  WORKERS: 'hyrlo_workers',
  BUSINESSES: 'hyrlo_businesses',
  JOBS: 'hyrlo_jobs',
  REQUESTS: 'hyrlo_requests',
  CURRENT_USER: 'hyrlo_current_user',
  ONBOARDING: 'hyrlo_onboarding',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export async function initStorage() {
  const ok = await api.initApi();
  if (ok) return;
  if (!localStorage.getItem(KEYS.WORKERS)) {
    const seed = getSeedData();
    save(KEYS.WORKERS, seed.workers);
    save(KEYS.BUSINESSES, seed.businesses);
    save(KEYS.JOBS, seed.jobs);
    save(KEYS.REQUESTS, seed.requests);
  }
}

export function getWorkers() {
  if (api.isUsingApi()) return api.getCached().workers;
  return load(KEYS.WORKERS, []);
}

export function getWorker(id) {
  if (api.isUsingApi()) return api.getCached().workers.find((w) => w.id === id);
  return getWorkers().find((w) => w.id === id);
}

export function saveWorker(worker) {
  if (api.isUsingApi()) return worker;
  const workers = getWorkers();
  const idx = workers.findIndex((w) => w.id === worker.id);
  if (idx >= 0) workers[idx] = worker;
  else workers.push(worker);
  save(KEYS.WORKERS, workers);
  return worker;
}

export function getBusinesses() {
  if (api.isUsingApi()) return api.getCached().businesses;
  return load(KEYS.BUSINESSES, []);
}

export function getBusiness(id) {
  if (api.isUsingApi()) return api.getCached().businesses.find((b) => b.id === id);
  return getBusinesses().find((b) => b.id === id);
}

export function saveBusiness(business) {
  if (api.isUsingApi()) return business;
  const businesses = getBusinesses();
  const idx = businesses.findIndex((b) => b.id === business.id);
  if (idx >= 0) businesses[idx] = business;
  else businesses.push(business);
  save(KEYS.BUSINESSES, businesses);
  return business;
}

export function getJobs() {
  if (api.isUsingApi()) return api.getCached().jobs;
  return load(KEYS.JOBS, []);
}

export function getJob(id) {
  return getJobs().find((j) => j.id === id);
}

export function getRequests() {
  if (api.isUsingApi()) return api.getCached().requests;
  return load(KEYS.REQUESTS, []);
}

export function getCurrentUser() {
  return load(KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user) {
  if (user) save(KEYS.CURRENT_USER, user);
  else localStorage.removeItem(KEYS.CURRENT_USER);
}

export function getOnboarding() {
  return load(KEYS.ONBOARDING, {});
}

export function saveOnboarding(data) {
  save(KEYS.ONBOARDING, { ...getOnboarding(), ...data });
}

export function clearOnboarding() {
  localStorage.removeItem(KEYS.ONBOARDING);
}

export async function refreshFromServer() {
  if (api.isUsingApi()) await api.apiRefresh();
}

export async function loginByPhone(phone) {
  if (api.isUsingApi()) return api.apiLogin(phone);
  const cleaned = phone.replace(/\D/g, '');
  const worker = getWorkers().find((w) => w.phone === cleaned);
  if (worker) return { id: worker.id, role: 'worker' };
  const biz = getBusinesses().find((b) => b.phone === cleaned);
  if (biz) return { id: biz.id, role: 'employer' };
  return { error: 'No account found' };
}

export async function applyToJob(workerId, businessId, jobId, message) {
  const existing = getRequests().find(
    (r) => r.worker_id === workerId && r.job_id === jobId && r.status === 'pending'
  ) || getRequests().find(
    (r) => r.workerId === workerId && r.jobId === jobId && r.status === 'pending'
  );
  if (existing) return { error: 'You already applied to this job' };

  if (api.isUsingApi()) {
    return api.apiCreateRequest({
      type: REQUEST_TYPES.WORKER_APPLIED,
      senderId: workerId,
      receiverId: businessId,
      workerId,
      businessId,
      jobId,
      message,
    });
  }
  const request = {
    id: `r_${Date.now()}`,
    type: REQUEST_TYPES.WORKER_APPLIED,
    senderId: workerId, receiverId: businessId, workerId, businessId, jobId,
    status: 'pending', message, createdAt: new Date().toISOString(),
  };
  const reqs = getRequests();
  reqs.push(request);
  save(KEYS.REQUESTS, reqs);
  return request;
}

export async function inviteWorker(employerId, workerId, businessId, jobId, message) {
  if (api.isUsingApi()) {
    return api.apiCreateRequest({
      type: REQUEST_TYPES.EMPLOYER_INVITED,
      senderId: employerId,
      receiverId: workerId,
      workerId,
      businessId,
      jobId,
      message,
    });
  }
  const request = {
    id: `r_${Date.now()}`,
    type: REQUEST_TYPES.EMPLOYER_INVITED,
    senderId: employerId, receiverId: workerId, workerId, businessId, jobId,
    status: 'pending', message, createdAt: new Date().toISOString(),
  };
  const reqs = getRequests();
  reqs.push(request);
  save(KEYS.REQUESTS, reqs);
  return request;
}

export async function updateRequestStatus(requestId, status) {
  if (api.isUsingApi()) {
    await api.apiUpdateRequest(requestId, status);
    await api.apiRefresh();
    return;
  }
  const reqs = getRequests();
  const req = reqs.find((r) => r.id === requestId);
  if (req) req.status = status;
  save(KEYS.REQUESTS, reqs);
}

export async function completeOnboarding(role, profileData) {
  if (api.isUsingApi()) {
    let result;
    if (role === 'worker') {
      result = await api.apiRegisterWorker({
        fullName: profileData.fullName,
        phone: profileData.phone,
        email: profileData.email,
        gender: profileData.gender,
        age: profileData.age,
        category: profileData.category,
        specialization: profileData.specialization,
        skills: profileData.skills,
        experience: profileData.experience,
        expectedPay: profileData.expectedPay,
        needWork: profileData.needWork,
        bio: profileData.bio,
        location: profileData.location,
      });
    } else {
      result = await api.apiRegisterBusiness({
        ownerName: profileData.ownerName,
        businessName: profileData.businessName,
        phone: profileData.phone,
        category: profileData.category,
        specialization: profileData.specialization,
        requirement: profileData.requirement,
        needWorker: profileData.needWorker,
        location: profileData.location,
      });
    }
    await api.apiRefresh();
    setCurrentUser({ id: result.id, role: result.role });
    clearOnboarding();
    return result;
  }

  const id = `${role === 'worker' ? 'w' : 'b'}_${Date.now()}`;
  const user = { id, role, ...profileData, createdAt: new Date().toISOString() };
  if (role === 'worker') saveWorker(user);
  else saveBusiness(user);
  setCurrentUser({ id, role });
  clearOnboarding();
  return user;
}

export async function updateProfile(user, data) {
  if (api.isUsingApi()) {
    if (user.role === 'worker') await api.apiPatchWorker(user.id, data);
    else await api.apiPatchBusiness(user.id, data);
    await api.apiRefresh();
    return;
  }
  if (user.role === 'worker') saveWorker({ ...getWorker(user.id), ...data });
  else saveBusiness({ ...getBusiness(user.id), ...data });
}
