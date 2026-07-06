import { getSeedData } from '../data/seedData';
import { REQUEST_TYPES } from '../constants/categories';

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

export function initStorage() {
  if (!localStorage.getItem(KEYS.WORKERS)) {
    const seed = getSeedData();
    save(KEYS.WORKERS, seed.workers);
    save(KEYS.BUSINESSES, seed.businesses);
    save(KEYS.JOBS, seed.jobs);
    save(KEYS.REQUESTS, seed.requests);
  }
}

export function resetDemoData() {
  const seed = getSeedData();
  save(KEYS.WORKERS, seed.workers);
  save(KEYS.BUSINESSES, seed.businesses);
  save(KEYS.JOBS, seed.jobs);
  save(KEYS.REQUESTS, seed.requests);
}

export function getWorkers() {
  return load(KEYS.WORKERS, []);
}

export function getWorker(id) {
  return getWorkers().find((w) => w.id === id);
}

export function saveWorker(worker) {
  const workers = getWorkers();
  const idx = workers.findIndex((w) => w.id === worker.id);
  if (idx >= 0) workers[idx] = worker;
  else workers.push(worker);
  save(KEYS.WORKERS, workers);
  return worker;
}

export function getBusinesses() {
  return load(KEYS.BUSINESSES, []);
}

export function getBusiness(id) {
  return getBusinesses().find((b) => b.id === id);
}

export function saveBusiness(business) {
  const businesses = getBusinesses();
  const idx = businesses.findIndex((b) => b.id === business.id);
  if (idx >= 0) businesses[idx] = business;
  else businesses.push(business);
  save(KEYS.BUSINESSES, businesses);
  return business;
}

export function getJobs() {
  return load(KEYS.JOBS, []);
}

export function getJob(id) {
  return getJobs().find((j) => j.id === id);
}

export function saveJob(job) {
  const jobs = getJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  save(KEYS.JOBS, jobs);
  return job;
}

export function getRequests() {
  return load(KEYS.REQUESTS, []);
}

export function saveRequest(request) {
  const requests = getRequests();
  const idx = requests.findIndex((r) => r.id === request.id);
  if (idx >= 0) requests[idx] = request;
  else requests.push(request);
  save(KEYS.REQUESTS, requests);
  return request;
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
  const existing = getOnboarding();
  save(KEYS.ONBOARDING, { ...existing, ...data });
}

export function clearOnboarding() {
  localStorage.removeItem(KEYS.ONBOARDING);
}

export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createRequest({ type, senderId, receiverId, workerId, businessId, jobId, message }) {
  const request = {
    id: generateId('r'),
    type,
    senderId,
    receiverId,
    workerId,
    businessId,
    jobId: jobId || null,
    status: 'pending',
    message: message || '',
    createdAt: new Date().toISOString(),
  };
  saveRequest(request);
  return request;
}

export function applyToJob(workerId, businessId, jobId, message) {
  const existing = getRequests().find(
    (r) => r.workerId === workerId && r.jobId === jobId && r.status === 'pending'
  );
  if (existing) return { error: 'You already applied to this job' };
  return createRequest({
    type: REQUEST_TYPES.WORKER_APPLIED,
    senderId: workerId,
    receiverId: businessId,
    workerId,
    businessId,
    jobId,
    message,
  });
}

export function inviteWorker(employerId, workerId, businessId, jobId, message) {
  const existing = getRequests().find(
    (r) => r.workerId === workerId && r.businessId === businessId && r.status === 'pending' && r.type === REQUEST_TYPES.EMPLOYER_INVITED
  );
  if (existing) return { error: 'You already sent a hire request to this worker' };
  return createRequest({
    type: REQUEST_TYPES.EMPLOYER_INVITED,
    senderId: employerId,
    receiverId: workerId,
    workerId,
    businessId,
    jobId,
    message,
  });
}

export function updateRequestStatus(requestId, status) {
  const request = getRequests().find((r) => r.id === requestId);
  if (!request) return null;
  request.status = status;
  saveRequest(request);

  if (status === 'accepted') {
    if (request.type === REQUEST_TYPES.WORKER_APPLIED) {
      const biz = getBusiness(request.businessId);
      if (biz) {
        biz.totalHires = (biz.totalHires || 0) + 1;
        saveBusiness(biz);
      }
      const worker = getWorker(request.workerId);
      if (worker) {
        worker.jobsCompleted = (worker.jobsCompleted || 0) + 1;
        saveWorker(worker);
      }
    }
    if (request.type === REQUEST_TYPES.EMPLOYER_INVITED) {
      const biz = getBusiness(request.businessId);
      if (biz) {
        biz.totalHires = (biz.totalHires || 0) + 1;
        saveBusiness(biz);
      }
    }
  }
  return request;
}

export function getRequestsForWorker(workerId) {
  return getRequests().filter(
    (r) => r.workerId === workerId || r.receiverId === workerId || r.senderId === workerId
  );
}

export function getRequestsForBusiness(businessId) {
  return getRequests().filter(
    (r) => r.businessId === businessId || r.receiverId === businessId || r.senderId === businessId
  );
}

export function completeOnboarding(role, profileData) {
  const id = generateId(role === 'worker' ? 'w' : 'b');
  const user = { id, role, ...profileData, createdAt: new Date().toISOString() };

  if (role === 'worker') {
    saveWorker(user);
  } else {
    saveBusiness(user);
  }

  setCurrentUser({ id, role });
  clearOnboarding();
  return user;
}
