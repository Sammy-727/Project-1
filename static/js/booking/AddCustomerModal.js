import { createCustomer } from './api.js';

const ID_PROOF_TYPES = ['Aadhar', 'Passport', 'Driving License', 'Voter ID', 'PAN Card', 'Other'];

export class AddCustomerModal {
  constructor(modalEl, { onCreated, compact = false }) {
    this.modal = modalEl;
    this.onCreated = onCreated;
    this.compact = compact;
    this.loading = false;
    this.render();
    this.bind();
  }

  render() {
    const proofOptions = ID_PROOF_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
    this.modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content ${this.compact ? 'modal-sm' : ''}">
        <button type="button" class="modal-close" aria-label="Close">✕</button>
        <h3>Add New Customer</h3>
        <form id="addCustomerForm" novalidate>
          <div class="form-grid">
            <div class="field"><label class="field-label">Full name <span class="required">*</span></label>
              <input class="input" name="name" required placeholder="Guest full name"></div>
            <div class="field"><label class="field-label">Phone <span class="required">*</span></label>
              <input class="input" name="phone" required placeholder="Mobile number"></div>
            <div class="field"><label class="field-label">Email</label>
              <input class="input" name="email" type="email" placeholder="email@example.com"></div>
            <div class="field"><label class="field-label">Gender</label>
              <select class="input" name="gender"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div class="field field-full"><label class="field-label">Address</label>
              <input class="input" name="address" placeholder="City, state"></div>
            <div class="field"><label class="field-label">ID proof type</label>
              <select class="input" name="id_proof_type"><option value="">Select</option>${proofOptions}</select></div>
            <div class="field"><label class="field-label">ID proof number</label>
              <input class="input" name="id_proof_number" placeholder="Document number"></div>
            <div class="field field-full"><label class="field-label">Emergency contact</label>
              <input class="input" name="emergency_contact" placeholder="Name & phone"></div>
          </div>
          <div class="form-error" id="addCustomerError" hidden></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="addCustomerSubmit">Save Customer</button>
          </div>
        </form>
      </div>
    `;
    this.form = this.modal.querySelector('#addCustomerForm');
    this.errorEl = this.modal.querySelector('#addCustomerError');
    this.submitBtn = this.modal.querySelector('#addCustomerSubmit');
  }

  bind() {
    this.modal.querySelector('.modal-overlay').addEventListener('click', () => this.close());
    this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.modal.querySelector('[data-action="cancel"]').addEventListener('click', () => this.close());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
  }

  open() {
    this.form.reset();
    this.errorEl.hidden = true;
    this.modal.classList.add('show');
    this.form.querySelector('[name="name"]')?.focus();
  }

  close() {
    this.modal.classList.remove('show');
  }

  setLoading(loading) {
    this.loading = loading;
    this.submitBtn.disabled = loading;
    this.submitBtn.textContent = loading ? 'Saving...' : 'Save Customer';
  }

  async submit() {
    const fd = new FormData(this.form);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.name?.trim() || !payload.phone?.trim()) {
      this.showError('Full name and phone are required.');
      return;
    }
    this.setLoading(true);
    this.errorEl.hidden = true;
    try {
      const customer = await createCustomer(payload);
      this.close();
      this.onCreated?.(customer);
      window.showToast?.('Customer added successfully.', 'success');
    } catch (err) {
      this.showError(err.message);
    } finally {
      this.setLoading(false);
    }
  }

  showError(msg) {
    this.errorEl.textContent = msg;
    this.errorEl.hidden = false;
  }
}
