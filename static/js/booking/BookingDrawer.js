import { createBooking, getAvailableRooms } from './api.js';
import { CustomerSearchSelect } from './CustomerSearchSelect.js';
import { AddCustomerModal } from './AddCustomerModal.js';
import { AvailableRoomPicker } from './AvailableRoomPicker.js';
import { PaymentStep } from './PaymentStep.js';
import { BookingSummary } from './BookingSummary.js';

const STEPS = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Dates & Guests' },
  { id: 3, label: 'Room' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Review' },
];

export class BookingDrawer {
  constructor(drawerEl, { bookingSources, paymentModes, onSuccess, onStepChange, embedded = false }) {
    this.drawer = drawerEl;
    this.bookingSources = bookingSources;
    this.paymentModes = paymentModes;
    this.onSuccess = onSuccess;
    this.onStepChange = onStepChange;
    this.embedded = embedded;
    this.step = 1;
    this.state = this.defaultState();
    this.submitting = false;
    this.idempotencyKey = null;
    this.render();
    this.mountComponents();
    this.bind();
  }

  defaultState() {
    return {
      customer: null,
      checkin: '',
      checkout: '',
      adults: 1,
      children: 0,
      booking_source: 'Walk-in',
      special_request: '',
      room: null,
      advance_amount: 0,
      payment_mode: 'Cash',
      nights: 0,
      total_amount: 0,
    };
  }

  render() {
    const sourceOptions = this.bookingSources
      .map((s) => `<option value="${s}">${s}</option>`)
      .join('');

    this.drawer.innerHTML = `
      <div class="booking-drawer-header${this.embedded ? ' booking-drawer-header-embedded' : ''}">
        <button type="button" class="icon-back-button booking-drawer-back" id="bkBackHeaderBtn" hidden aria-label="Go Back" title="Go Back">
          <i data-lucide="arrow-left" class="icon" aria-hidden="true"></i>
        </button>
        <div class="booking-drawer-header-center">
          <h2>New Booking</h2>
          <p class="text-muted booking-drawer-sub">Fast front-desk booking workflow</p>
        </div>
        <button type="button" class="modal-close drawer-close" aria-label="Close">✕</button>
      </div>
      <div class="booking-steps" id="bookingSteps"></div>
      <div class="booking-step-error" id="bookingStepError" hidden></div>

      <div class="booking-step-panel" data-step="1">
        <div id="customerSearchMount"></div>
      </div>

      <div class="booking-step-panel" data-step="2" hidden>
        <div class="form-grid">
          <div class="field"><label class="field-label">Check-in <span class="required">*</span></label>
            <input class="input" type="date" id="bkCheckin"></div>
          <div class="field"><label class="field-label">Check-out <span class="required">*</span></label>
            <input class="input" type="date" id="bkCheckout"></div>
          <div class="field"><label class="field-label">Adults</label>
            <input class="input" type="number" id="bkAdults" min="1" value="1"></div>
          <div class="field"><label class="field-label">Children</label>
            <input class="input" type="number" id="bkChildren" min="0" value="0"></div>
          <div class="field"><label class="field-label">Total guests</label>
            <input class="input" type="number" id="bkGuests" min="1" value="1" readonly></div>
          <div class="field"><label class="field-label">Booking source</label>
            <select class="input" id="bkSource">${sourceOptions}</select></div>
          <div class="field field-full"><label class="field-label">Special request</label>
            <textarea class="input" id="bkSpecial" rows="3" placeholder="Late check-in, extra pillows, etc."></textarea></div>
        </div>
      </div>

      <div class="booking-step-panel" data-step="3" hidden>
        <div id="roomPickerMount"></div>
      </div>

      <div class="booking-step-panel" data-step="4" hidden>
        <div id="paymentStepMount"></div>
      </div>

      <div class="booking-step-panel" data-step="5" hidden>
        <div id="summaryMount"></div>
      </div>

      <div class="booking-drawer-footer">
        <button type="button" class="icon-back-button" id="bkPrevBtn" hidden aria-label="Go Back" title="Go Back">
          <i data-lucide="arrow-left" class="icon" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn btn-primary" id="bkNextBtn">Continue</button>
        <button type="button" class="btn btn-success" id="bkConfirmBtn" hidden>
          <span class="bk-confirm-label">Confirm Booking</span>
        </button>
      </div>

      <div class="modal" id="inlineAddCustomerModal"></div>
    `;

    this.stepsEl = this.drawer.querySelector('#bookingSteps');
    this.errorEl = this.drawer.querySelector('#bookingStepError');
    this.backHeaderBtn = this.drawer.querySelector('#bkBackHeaderBtn');
    this.prevBtn = this.drawer.querySelector('#bkPrevBtn');
    this.nextBtn = this.drawer.querySelector('#bkNextBtn');
    this.confirmBtn = this.drawer.querySelector('#bkConfirmBtn');
    this.confirmLabel = this.drawer.querySelector('.bk-confirm-label');
    this.panels = this.drawer.querySelectorAll('.booking-step-panel');
    this.renderSteps();
  }

  mountComponents() {
    this.customerSearch = new CustomerSearchSelect(this.drawer.querySelector('#customerSearchMount'), {
      onSelect: (c) => { this.state.customer = c; },
      onAddNew: () => this.inlineCustomerModal.open(),
    });

    this.inlineCustomerModal = new AddCustomerModal(this.drawer.querySelector('#inlineAddCustomerModal'), {
      onCreated: (customer) => this.customerSearch.select(customer),
    });

    this.roomPicker = new AvailableRoomPicker(this.drawer.querySelector('#roomPickerMount'), {
      onSelect: (room) => {
        this.state.room = room;
        this.updateTotals();
      },
    });

    this.paymentStep = new PaymentStep(this.drawer.querySelector('#paymentStepMount'), {
      paymentModes: this.paymentModes,
      onChange: (p) => {
        this.state.advance_amount = p.advance_amount;
        this.state.payment_mode = p.payment_mode;
        if (this.step === 5) this.renderSummary();
      },
    });

    this.summary = new BookingSummary(this.drawer.querySelector('#summaryMount'));

    this.checkinInput = this.drawer.querySelector('#bkCheckin');
    this.checkoutInput = this.drawer.querySelector('#bkCheckout');
    this.adultsInput = this.drawer.querySelector('#bkAdults');
    this.childrenInput = this.drawer.querySelector('#bkChildren');
    this.guestsInput = this.drawer.querySelector('#bkGuests');
    this.sourceInput = this.drawer.querySelector('#bkSource');
    this.specialInput = this.drawer.querySelector('#bkSpecial');

    const today = new Date().toISOString().slice(0, 10);
    this.checkinInput.min = today;
    this.checkoutInput.min = today;
    this.checkinInput.value = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.checkoutInput.value = tomorrow.toISOString().slice(0, 10);
  }

  bind() {
    this.drawer.querySelector('.drawer-close')?.addEventListener('click', () => this.close());
    const goBack = () => this.goStep(this.step - 1);
    this.prevBtn.addEventListener('click', goBack);
    this.backHeaderBtn.addEventListener('click', goBack);
    this.nextBtn.addEventListener('click', () => this.next());
    this.confirmBtn.addEventListener('click', () => this.submit());

    const syncGuests = () => {
      const adults = Math.max(1, parseInt(this.adultsInput.value, 10) || 1);
      const children = Math.max(0, parseInt(this.childrenInput.value, 10) || 0);
      this.adultsInput.value = adults;
      this.childrenInput.value = children;
      this.guestsInput.value = adults + children;
    };
    this.adultsInput.addEventListener('input', syncGuests);
    this.childrenInput.addEventListener('input', syncGuests);

    this.checkinInput.addEventListener('change', () => {
      if (this.checkoutInput.value <= this.checkinInput.value) {
        const d = new Date(this.checkinInput.value);
        d.setDate(d.getDate() + 1);
        this.checkoutInput.value = d.toISOString().slice(0, 10);
      }
      this.checkoutInput.min = this.checkinInput.value;
    });
  }

  renderSteps() {
    this.stepsEl.innerHTML = STEPS.map(
      (s) => `
      <div class="booking-step ${s.id === this.step ? 'active' : ''} ${s.id < this.step ? 'done' : ''}">
        <span class="step-num">${s.id}</span>
        <span class="step-label">${s.label}</span>
      </div>`,
    ).join('');
    this.panels.forEach((p) => {
      p.hidden = Number(p.dataset.step) !== this.step;
    });
    const showBack = this.step > 1 && !this.embedded;
    this.prevBtn.hidden = !showBack;
    if (this.backHeaderBtn) this.backHeaderBtn.hidden = !showBack;
    this.nextBtn.hidden = this.step === 5;
    this.confirmBtn.hidden = this.step !== 5;
    this.errorEl.hidden = true;
    window.refreshIcons?.(this.drawer);
    this.onStepChange?.(this.step);
    if (this.embedded) window.AppDrawer?.updateHeader?.();
  }

  isDirty() {
    if (this.step > 1) return true;
    if (this.state.customer) return true;
    if (this.specialInput?.value?.trim()) return true;
    if (this.state.advance_amount > 0) return true;
    return false;
  }

  async open(options = {}) {
    this.step = 1;
    this.state = this.defaultState();
    this.submitting = false;
    this.idempotencyKey = crypto.randomUUID?.() || `bk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.customerSearch.clear();
    this.roomPicker.selected = null;
    this.state.room = null;
    this.paymentStep.advanceInput.value = 0;
    this.setConfirmLoading(false);
    this.renderSteps();
    if (options.customerId) {
      await this.customerSearch.selectById(options.customerId);
      this.state.customer = this.customerSearch.getValue();
    }
    if (options.roomNo && !(options.checkin && options.checkout)) {
      const base = new Date();
      const checkin = new Date(base);
      checkin.setDate(checkin.getDate() + 1);
      const checkout = new Date(base);
      checkout.setDate(checkout.getDate() + 2);
      const fmt = (d) => d.toISOString().slice(0, 10);
      options.checkin = fmt(checkin);
      options.checkout = fmt(checkout);
    }
    if (options.checkin) {
      this.checkinInput.value = options.checkin;
      this.checkoutInput.min = options.checkin;
    }
    if (options.checkout) {
      this.checkoutInput.value = options.checkout;
    }
    if (options.checkin && options.checkout) {
      this.readDatesStep();
      const guests = this.state.adults + this.state.children;
      await this.roomPicker.load({
        checkin: options.checkin,
        checkout: options.checkout,
        guests,
      });
      if (options.roomNo) {
        const match = this.roomPicker.rooms.find((r) => String(r.room_no) === String(options.roomNo));
        if (match) {
          this.roomPicker.select(match.id);
          this.state.room = match;
          this.updateTotals();
        }
      }
      if (options.customerId && this.state.room) {
        this.goStep(4);
      } else if (this.state.room) {
        this.goStep(3);
      } else {
        this.goStep(2);
      }
    }
    if (!this.embedded) {
      this.drawer.classList.add('open');
      document.getElementById('drawerBackdrop')?.classList.add('show');
    }
  }

  close() {
    if (!this.embedded) {
      this.drawer.classList.remove('open');
      document.getElementById('drawerBackdrop')?.classList.remove('show');
    } else {
      window.AppDrawer?.close();
    }
  }

  showError(msg) {
    this.errorEl.textContent = msg;
    this.errorEl.hidden = false;
  }

  setConfirmLoading(loading) {
    this.confirmBtn.disabled = loading;
    this.confirmBtn.classList.toggle('is-loading', loading);
    if (this.confirmLabel) {
      this.confirmLabel.textContent = loading ? 'Creating...' : 'Confirm Booking';
    }
  }

  readDatesStep() {
    this.state.checkin = this.checkinInput.value;
    this.state.checkout = this.checkoutInput.value;
    this.state.adults = parseInt(this.adultsInput.value, 10) || 1;
    this.state.children = parseInt(this.childrenInput.value, 10) || 0;
    this.state.booking_source = this.sourceInput.value;
    this.state.special_request = this.specialInput.value.trim();
  }

  updateTotals() {
    if (!this.state.room || !this.state.checkin || !this.state.checkout) return;
    const ci = new Date(this.state.checkin);
    const co = new Date(this.state.checkout);
    const nights = Math.max(Math.round((co - ci) / 86400000), 1);
    this.state.nights = nights;
    this.state.total_amount = this.state.room.price * nights;
    this.paymentStep.setTotal(this.state.total_amount);
  }

  validateStep() {
    if (this.step === 1) return this.customerSearch.validate();
    if (this.step === 2) {
      this.readDatesStep();
      if (!this.state.checkin || !this.state.checkout) return 'Check-in and check-out are required.';
      if (this.state.checkout <= this.state.checkin) return 'Check-out must be after check-in.';
      return null;
    }
    if (this.step === 3) return this.roomPicker.validate();
    if (this.step === 4) {
      this.updateTotals();
      const payment = this.paymentStep.getValue();
      this.state.advance_amount = payment.advance_amount;
      this.state.payment_mode = payment.payment_mode;
      return this.paymentStep.validate(this.state.total_amount);
    }
    return null;
  }

  async next() {
    const err = this.validateStep();
    if (err) {
      this.showError(err);
      return;
    }
    if (this.step === 2) {
      this.readDatesStep();
      const guests = this.state.adults + this.state.children;
      const prevRoomId = this.state.room?.id;
      await this.roomPicker.load({
        checkin: this.state.checkin,
        checkout: this.state.checkout,
        guests,
      });
      if (prevRoomId && this.roomPicker.rooms.some((r) => r.id === prevRoomId)) {
        this.roomPicker.select(prevRoomId);
        this.state.room = this.roomPicker.getValue();
        this.updateTotals();
      }
    }
    if (this.step === 3) this.updateTotals();
    if (this.step === 4) this.renderSummary();
    this.goStep(this.step + 1);
  }

  goStep(step) {
    this.step = Math.min(Math.max(step, 1), 5);
    this.renderSteps();
    if (this.step === 5) this.renderSummary();
  }

  renderSummary() {
    const balance = Math.max(this.state.total_amount - (this.state.advance_amount || 0), 0);
    this.summary.render({
      customer: this.state.customer,
      room: this.state.room,
      checkin: this.state.checkin,
      checkout: this.state.checkout,
      nights: this.state.nights,
      adults: this.state.adults,
      children: this.state.children,
      numGuests: this.state.adults + this.state.children,
      bookingSource: this.state.booking_source,
      specialRequest: this.state.special_request,
      totalAmount: this.state.total_amount,
      advancePaid: this.state.advance_amount,
      balance,
    });
  }

  async verifyRoomStillAvailable() {
    const guests = this.state.adults + this.state.children;
    const { rooms } = await getAvailableRooms(this.state.checkin, this.state.checkout, guests);
    const still = rooms.some((r) => r.id === this.state.room?.id);
    if (!still) {
      this.showError('This room is no longer available for the selected dates. Please choose another room.');
      await this.roomPicker.load({
        checkin: this.state.checkin,
        checkout: this.state.checkout,
        guests,
      });
      this.state.room = null;
      this.goStep(3);
      return false;
    }
    return true;
  }

  async submit() {
    if (this.submitting) return;
    const err = this.validateStep();
    if (err) {
      this.showError(err);
      return;
    }
    this.submitting = true;
    this.setConfirmLoading(true);
    try {
      const available = await this.verifyRoomStillAvailable();
      if (!available) return;

      const payload = {
        customer_id: this.state.customer.id,
        room_id: this.state.room.id,
        checkin: this.state.checkin,
        checkout: this.state.checkout,
        adults: this.state.adults,
        children: this.state.children,
        num_guests: this.state.adults + this.state.children,
        booking_source: this.state.booking_source,
        special_request: this.state.special_request,
        advance_amount: this.state.advance_amount,
        payment_mode: this.state.payment_mode,
      };
      await createBooking(payload, this.idempotencyKey);
      this.close();
      window.showToast?.('Booking created successfully.', 'success');
      this.onSuccess?.();
    } catch (e) {
      const msg = e.message || 'Could not create booking.';
      if (e.status === 409) {
        this.showError(msg);
        const guests = this.state.adults + this.state.children;
        await this.roomPicker.load({
          checkin: this.state.checkin,
          checkout: this.state.checkout,
          guests,
        });
        this.state.room = null;
        this.goStep(3);
      } else {
        this.showError(msg);
      }
    } finally {
      this.submitting = false;
      this.setConfirmLoading(false);
    }
  }
}
