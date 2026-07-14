/** Shared Axios client with JSON defaults and unified error handling */
const api = axios.create({
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

function apiErrorMessage(err) {
  const data = err.response?.data;
  return data?.message || data?.error || err.message || 'Network error';
}

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.ok === false) {
      const e = new Error(res.data.message || res.data.error || 'Request failed');
      e.status = res.status;
      e.userFacing = true;
      return Promise.reject(e);
    }
    return res;
  },
  (err) => {
    const e = new Error(apiErrorMessage(err));
    e.status = err.response?.status;
    e.userFacing = true;
    return Promise.reject(e);
  },
);

export async function fetchJson(url, options = {}) {
  const res = await api.get(url, options);
  return res.data;
}

export default api;
