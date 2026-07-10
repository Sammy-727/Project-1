import { calendarColor, escapeHtml } from './BookingActions.js';
import { updateBooking } from '../api.js';

export class BookingCalendarView {
  constructor(mount, store) {
    this.mount = mount;
    this.store = store;
    this.calendar = null;
    this.subRange = null;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'calendar') {
      this.mount.hidden = true;
      return;
    }
    this.mount.hidden = false;
    if (!this.mount.querySelector('#bookingFullCalendar')) {
      this.mount.innerHTML = `
        <div class="booking-calendar-toolbar">
          <div class="booking-calendar-range-tabs" role="tablist">
            <button type="button" class="booking-cal-range active" data-cal-view="dayGridMonth">Month</button>
            <button type="button" class="booking-cal-range" data-cal-view="timeGridWeek">Week</button>
            <button type="button" class="booking-cal-range" data-cal-view="timeGridDay">Day</button>
          </div>
        </div>
        <div id="bookingFullCalendar" class="booking-fullcalendar"></div>`;
      this.initCalendar();
      this.mount.querySelectorAll('[data-cal-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.mount.querySelectorAll('[data-cal-view]').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.calendar?.changeView(btn.dataset.calView);
        });
      });
    }
    this.updateEvents(snap.filtered);
  }

  initCalendar() {
    const el = this.mount.querySelector('#bookingFullCalendar');
    if (!el) return;
    if (typeof FullCalendar === 'undefined') {
      el.innerHTML = '<p class="ops-empty">Calendar could not load. Please refresh the page.</p>';
      return;
    }
    const canDrag = !document.body.classList.contains('read-only-mode');
    this.calendar = new FullCalendar.Calendar(el, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: '',
      },
      height: 'auto',
      events: [],
      eventClick: (info) => {
        const booking = info.event.extendedProps.booking;
        if (booking) {
          this.store.setSelectedBooking(booking.id);
          import('./BookingActions.js').then((m) => m.openBookingDetail(booking));
        }
      },
      editable: canDrag,
      eventDrop: async (info) => {
        const booking = info.event.extendedProps.booking;
        if (!booking) {
          info.revert();
          return;
        }
        const checkin = info.event.startStr?.slice(0, 10);
        let checkout = info.event.endStr?.slice(0, 10);
        if (!checkin || !checkout) {
          info.revert();
          return;
        }
        if (checkout <= checkin) {
          const end = new Date(checkin);
          end.setDate(end.getDate() + 1);
          checkout = end.toISOString().slice(0, 10);
        }
        try {
          await updateBooking(booking.id, { checkin, checkout });
          window.showToast?.('Booking dates updated.', 'success');
          await window.bookingModule?.refresh?.();
        } catch (e) {
          info.revert();
          window.showToast?.(e.message || 'Could not reschedule booking.', 'danger');
        }
      },
    });
    this.calendar.render();
  }

  updateEvents(bookings) {
    if (!this.calendar) return;
    const events = bookings.map((b) => ({
      id: String(b.id),
      title: `${b.customer_name} · Rm ${b.room_no}`,
      start: b.checkin,
      end: b.checkout,
      allDay: true,
      backgroundColor: calendarColor(b.status, b.payment_status),
      borderColor: calendarColor(b.status, b.payment_status),
      extendedProps: { booking: b },
    }));
    this.calendar.removeAllEvents();
    events.forEach((e) => this.calendar.addEvent(e));
  }
}
