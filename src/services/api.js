const API = '/api';

let cache = { workers: [], businesses: [], jobs: [], requests: [] };
let useApi = false;

async function tryApi() {
  try {
    const r = await fetch(`${API}/health`);
    useApi = r.ok;
    return useApi;
  } catch {
    useApi = false;
    return false;
  }
}

export async function initApi() {
  if (!(await tryApi())) return false;
  const [workers, businesses, jobs, requests] = await Promise.all([
    fetch(`${API}/workers`).then((r) => r.json()),
    fetch(`${API}/businesses`).then((r) => r.json()),
    fetch(`${API}/jobs`).then((r) => r.json()),
    fetch(`${API}/requests`).then((r) => r.json()),
  ]);
  cache = { workers, businesses, jobs, requests };
  return true;
}

export function isUsingApi() {
  return useApi;
}

export function getCached() {
  return cache;
}

export async function apiLogin(phone) {
  const r = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
  });
  if (!r.ok) return { error: 'No account found' };
  return r.json();
}

export async function apiRegisterWorker(data) {
  const r = await fetch(`${API}/workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function apiRegisterBusiness(data) {
  const r = await fetch(`${API}/businesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function apiPatchWorker(id, data) {
  await fetch(`${API}/workers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiPatchBusiness(id, data) {
  await fetch(`${API}/businesses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiCreateRequest(data) {
  const r = await fetch(`${API}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) return { error: 'Request failed' };
  return r.json();
}

export async function apiUpdateRequest(id, status) {
  await fetch(`${API}/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function apiRefresh() {
  if (!useApi) return cache;
  const [workers, businesses, jobs, requests] = await Promise.all([
    fetch(`${API}/workers`).then((r) => r.json()),
    fetch(`${API}/businesses`).then((r) => r.json()),
    fetch(`${API}/jobs`).then((r) => r.json()),
    fetch(`${API}/requests`).then((r) => r.json()),
  ]);
  cache = { workers, businesses, jobs, requests };
  return cache;
}

export async function apiGetWorker(id) {
  const r = await fetch(`${API}/workers/${id}`);
  return r.ok ? r.json() : null;
}

export async function apiGetBusiness(id) {
  const r = await fetch(`${API}/businesses/${id}`);
  return r.ok ? r.json() : null;
}

export async function apiGetRequests(userId) {
  const r = await fetch(`${API}/requests?user_id=${userId}`);
  return r.ok ? r.json() : [];
}
