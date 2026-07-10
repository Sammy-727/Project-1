/** Shared Axios client with JSON defaults and unified error handling */
const api = axios.create({
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

function apiErrorMessage(err) {
  return err.response?.data?.error || err.message || 'Network error';
}

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.ok === false) {
      const e = new Error(res.data.error || 'Request failed');
      e.status = res.status;
      return Promise.reject(e);
    }
    return res;
  },
  (err) => {
    const e = new Error(apiErrorMessage(err));
    e.status = err.response?.status;
    return Promise.reject(e);
  },
);

export async function fetchJson(url, options = {}) {
  const res = await api.get(url, options);
  return res.data;
}

export default api;
