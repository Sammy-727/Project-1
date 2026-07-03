(function () {
  window.showToast = window.showToast || function (message) {
    const el = document.createElement('div');
    el.className = 'alert alert-danger';
    el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;max-width:320px';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  };

  const state = {
    hotels: [],
    hotelId: null,
    checkIn: '',
    checkOut: '',
    guests: 2,
    rooms: [],
    selectedRoom: null,
    booking: null,
    step: 1,
  };

  const els = {
    steps: () => document.querySelectorAll('.booking-step'),
    panels: {
      1: document.getElementById('step1Panel'),
      2: document.getElementById('step2Panel'),
      3: document.getElementById('step3Panel'),
      4: document.getElementById('step4Panel'),
    },
  };

  function formatMoney(n) {
    return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  function setStep(step) {
    state.step = step;
    els.steps().forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle('active', n === step);
      el.classList.toggle('done', n < step);
    });
    Object.entries(els.panels).forEach(([n, panel]) => {
      if (panel) panel.hidden = Number(n) !== step;
    });
  }

  function tomorrowIso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function dayAfter(iso) {
    const d = new Date(iso);
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }

  async function loadHotels() {
    const select = document.getElementById('hotelSelect');
    if (!select) return;
    try {
      const { data } = await axios.get('/api/public/hotels');
      state.hotels = data.hotels || [];
      select.innerHTML = '<option value="">Select a hotel</option>' +
        state.hotels.map((h) => `<option value="${h.hotelId}">${h.hotelName} — ${h.city}, ${h.state}</option>`).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load hotels</option>';
      window.showToast?.(err.response?.data?.error || 'Could not load hotels', 'danger');
    }
  }

  function initBookPage() {
    const app = document.getElementById('publicBookingApp');
    if (!app) return;

    const checkIn = document.getElementById('checkInDate');
    const checkOut = document.getElementById('checkOutDate');
    if (checkIn && checkOut) {
      checkIn.min = new Date().toISOString().slice(0, 10);
      checkIn.value = tomorrowIso();
      checkOut.min = dayAfter(checkIn.value);
      checkOut.value = dayAfter(checkIn.value);
      checkIn.addEventListener('change', () => {
        checkOut.min = dayAfter(checkIn.value);
        if (checkOut.value <= checkIn.value) checkOut.value = dayAfter(checkIn.value);
      });
    }

    loadHotels();
    setStep(1);

    document.getElementById('searchRoomsBtn')?.addEventListener('click', searchRooms);
    document.getElementById('backToStep1')?.addEventListener('click', () => setStep(1));
    document.getElementById('continueToPayBtn')?.addEventListener('click', createBooking);
    document.getElementById('payNowBtn')?.addEventListener('click', processPayment);
  }

  async function searchRooms() {
    const hotelId = Number(document.getElementById('hotelSelect')?.value);
    const checkIn = document.getElementById('checkInDate')?.value;
    const checkOut = document.getElementById('checkOutDate')?.value;
    const guests = Number(document.getElementById('numGuests')?.value || 1);

    if (!hotelId || !checkIn || !checkOut) {
      window.showToast?.('Please select hotel and dates', 'danger');
      return;
    }

    state.hotelId = hotelId;
    state.checkIn = checkIn;
    state.checkOut = checkOut;
    state.guests = guests;
    state.selectedRoom = null;

    const loading = document.getElementById('roomsLoading');
    const grid = document.getElementById('roomsGrid');
    const empty = document.getElementById('roomsEmpty');
    loading.hidden = false;
    grid.innerHTML = '';
    empty.hidden = true;
    setStep(2);

    try {
      const { data } = await axios.get(`/api/public/hotels/${hotelId}/rooms/available`, {
        params: { checkIn, checkOut, guests },
      });
      state.rooms = data.rooms || [];
      loading.hidden = true;
      if (!state.rooms.length) {
        empty.hidden = false;
        return;
      }
      grid.innerHTML = state.rooms.map((room) => `
        <article class="entity-card room-pick-card" data-room-id="${room.roomId}">
          <div class="entity-card-header">
            <div>
              <div class="entity-card-sub">Room ${room.roomNo} · Floor ${room.floor}</div>
              <div class="entity-card-title">${room.roomType}</div>
            </div>
            <div class="room-pick-price">${formatMoney(room.totalPrice)}</div>
          </div>
          <div class="entity-card-body">
            <p class="muted">${room.nights} night(s) · Up to ${room.capacity} guests</p>
            <p class="muted">${room.amenities || 'Standard amenities'}</p>
            <p><strong>${formatMoney(room.pricePerNight)}</strong> / night</p>
          </div>
          <div class="entity-card-footer">
            <button type="button" class="btn btn-sm btn-primary select-room-btn">Select Room</button>
          </div>
        </article>
      `).join('');

      grid.querySelectorAll('.room-pick-card').forEach((card) => {
        card.addEventListener('click', () => selectRoom(Number(card.dataset.roomId)));
      });
    } catch (err) {
      loading.hidden = true;
      empty.hidden = false;
      window.showToast?.(err.response?.data?.error || 'Failed to load rooms', 'danger');
    }
  }

  function selectRoom(roomId) {
    state.selectedRoom = state.rooms.find((r) => r.roomId === roomId);
    if (!state.selectedRoom) return;

    document.querySelectorAll('.room-pick-card').forEach((c) => {
      c.classList.toggle('selected', Number(c.dataset.roomId) === roomId);
    });

    const hotel = state.hotels.find((h) => h.hotelId === state.hotelId);
    document.getElementById('selectedRoomSummary').innerHTML = `
      <strong>${hotel?.hotelName || 'Hotel'}</strong><br>
      Room ${state.selectedRoom.roomNo} (${state.selectedRoom.roomType})<br>
      ${state.checkIn} → ${state.checkOut} · ${state.guests} guest(s)<br>
      Total: <strong>${formatMoney(state.selectedRoom.totalPrice)}</strong>
    `;
    setStep(3);
  }

  async function createBooking() {
    const name = document.getElementById('guestName')?.value.trim();
    const phone = document.getElementById('guestPhone')?.value.trim();
    const email = document.getElementById('guestEmail')?.value.trim();
    const gender = document.getElementById('guestGender')?.value;
    const specialRequest = document.getElementById('specialRequest')?.value.trim();

    if (!name || !phone) {
      window.showToast?.('Name and phone are required', 'danger');
      return;
    }
    if (!state.selectedRoom) {
      window.showToast?.('Please select a room', 'danger');
      return;
    }

    const btn = document.getElementById('continueToPayBtn');
    btn.disabled = true;
    try {
      const { data } = await axios.post('/api/public/bookings', {
        hotelId: state.hotelId,
        roomId: state.selectedRoom.roomId,
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        numGuests: state.guests,
        adults: state.guests,
        specialRequest,
        guest: { name, phone, email, gender },
      });
      state.booking = data.booking;
      renderReview();
      setStep(4);
    } catch (err) {
      window.showToast?.(err.response?.data?.error || 'Could not create booking', 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  function renderReview() {
    const b = state.booking;
    const total = b.totalAmount;
    const advance = Math.ceil(total * 0.3);
    document.getElementById('bookingReview').innerHTML = `
      <div><strong>Booking #</strong> ${b.bookingNumber}</div>
      <div><strong>Hotel</strong> ${b.hotelName}</div>
      <div><strong>Room</strong> ${b.roomNo} (${b.roomType})</div>
      <div><strong>Guest</strong> ${b.guestName} · ${b.guestPhone}</div>
      <div><strong>Dates</strong> ${b.checkIn} → ${b.checkOut}</div>
      <div><strong>Total</strong> ${formatMoney(total)}</div>
      <div><strong>Advance (30%)</strong> ${formatMoney(advance)}</div>
    `;
    const paymentType = document.getElementById('paymentType');
    paymentType?.addEventListener('change', updatePayLabel);
    updatePayLabel();
  }

  function updatePayLabel() {
    const btn = document.getElementById('payNowBtn');
    const type = document.getElementById('paymentType')?.value;
    const total = state.booking?.totalAmount || 0;
    const amount = type === 'FULL' ? total : Math.ceil(total * 0.3);
    if (btn) btn.textContent = `Pay ${formatMoney(amount)} & Confirm`;
  }

  async function processPayment() {
    if (!state.booking) return;
    const btn = document.getElementById('payNowBtn');
    const paymentType = document.getElementById('paymentType')?.value || 'ADVANCE';
    const paymentMode = document.getElementById('paymentMode')?.value || 'UPI';
    const total = state.booking.totalAmount;
    const amount = paymentType === 'FULL' ? total : Math.ceil(total * 0.3);

    btn.disabled = true;
    try {
      const { data } = await axios.post(`/api/public/bookings/${state.booking.bookingId}/payment`, {
        amount,
        paymentType,
        paymentMode,
        gateway: 'mock',
        mockSuccess: true,
      });
      window.location.href = `/book/confirmation/${data.booking.bookingNumber}`;
    } catch (err) {
      window.showToast?.(err.response?.data?.error || 'Payment failed', 'danger');
      btn.disabled = false;
    }
  }

  async function initConfirmationPage() {
    const root = document.getElementById('confirmationApp');
    if (!root) return;
    const bookingNumber = root.dataset.bookingNumber;
    const card = document.getElementById('confirmationCard');
    try {
      const { data } = await axios.get(`/api/public/bookings/${bookingNumber}`);
      const b = data.booking;
      card.innerHTML = `
        <div class="confirmation-icon">✓</div>
        <h1>Booking Confirmed!</h1>
        <p class="muted">Your reservation has been received. Save your booking number.</p>
        <div class="confirmation-meta">
          <div><span>Booking Number</span><strong>${b.bookingNumber}</strong></div>
          <div><span>Hotel</span><strong>${b.hotelName}</strong></div>
          <div><span>Room</span><strong>${b.roomNo} (${b.roomType})</strong></div>
          <div><span>Guest</span><strong>${b.guestName}</strong></div>
          <div><span>Check-in</span><strong>${b.checkIn}</strong></div>
          <div><span>Check-out</span><strong>${b.checkOut}</strong></div>
          <div><span>Status</span><strong>${b.status}</strong></div>
          <div><span>Payment</span><strong>${b.paymentStatus} · ${formatMoney(b.paidAmount)}</strong></div>
          <div><span>Total</span><strong>${formatMoney(b.totalAmount)}</strong></div>
        </div>
      `;
    } catch (err) {
      card.innerHTML = `
        <h1>Booking Not Found</h1>
        <p class="muted">${err.response?.data?.error || 'Unable to load booking details.'}</p>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initBookPage();
    initConfirmationPage();
    window.lucide?.createIcons?.();
  });
})();
