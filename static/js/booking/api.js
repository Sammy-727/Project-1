/** Axios-style API client for booking workflow */
const api = axios.create({
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.ok === false) {
      return Promise.reject(new Error(res.data.error || 'Request failed'));
    }
    return res;
  },
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
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

export function createBooking(payload) {
  return api.post('/api/bookings', payload).then((r) => r.data);
}

export function fetchBookings(params = {}) {
  const qs = new URLSearchParams(params);
  const query = qs.toString();
  return api.get(`/api/bookings/list${query ? `?${query}` : ''}`).then((r) => r.data.bookings);
}

export default api;
