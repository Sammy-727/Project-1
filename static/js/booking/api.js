/** Axios-style API client for booking workflow */
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

export function getCustomer(id) {
  return api.get(`/api/customers/${id}`).then((r) => r.data.customer);
}

export function searchCustomers(q) {
  return api.get('/api/customers/search', { params: { q } }).then((r) => r.data.customers);
}

export function createCustomer(payload) {
  return api.post('/api/customers', payload).then((r) => r.data.customer);
}

export function getAvailableRooms(checkin, checkout, guests) {
  return api
    .get('/api/rooms/available', { params: { checkin, checkout, guests } })
    .then((r) => ({ rooms: r.data.rooms, nights: r.data.nights }));
}

export function createBooking(payload, idempotencyKey) {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
  return api.post('/api/bookings', payload, { headers }).then((r) => r.data);
}

export function updateBooking(bookingId, payload) {
  return api.patch(`/api/bookings/${bookingId}`, payload).then((r) => r.data);
}

export function fetchBookings(query = '') {
  const q = query.startsWith('?') ? query : query ? `?${query}` : '';
  return api.get(`/api/bookings/list${q}`).then((r) => r.data);
}

export default api;
