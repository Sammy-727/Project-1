export class PaymentStep {
  constructor(root, { paymentModes = ['Cash', 'UPI', 'Card', 'Bank Transfer'], onChange }) {
    this.root = root;
    this.paymentModes = paymentModes;
    this.onChange = onChange;
    this.render();
    this.bind();
  }

  render() {
    const modeOptions = this.paymentModes.map((m) => `<option value="${m}">${m}</option>`).join('');
    this.root.innerHTML = `
      <div class="form-grid">
        <div class="field">
          <label class="field-label">Advance amount</label>
          <input class="input" type="number" id="advanceAmount" min="0" step="0.01" value="0" placeholder="0">
        </div>
        <div class="field">
          <label class="field-label">Payment mode</label>
          <select class="input" id="paymentMode">${modeOptions}</select>
        </div>
      </div>
      <div class="payment-hint" id="paymentHint">Collect advance payment now or leave as 0 to pay later.</div>
    `;
    this.advanceInput = this.root.querySelector('#advanceAmount');
    this.modeSelect = this.root.querySelector('#paymentMode');
    this.hintEl = this.root.querySelector('#paymentHint');
  }

  bind() {
    const notify = () => this.onChange?.(this.getValue());
    this.advanceInput.addEventListener('input', notify);
    this.modeSelect.addEventListener('change', notify);
  }

  setTotal(total) {
    this.total = total;
    this.hintEl.textContent = `Room total: ₹${formatNum(total)}. Enter advance to collect now.`;
  }

  getValue() {
    return {
      advance_amount: parseFloat(this.advanceInput.value) || 0,
      payment_mode: this.modeSelect.value,
    };
  }

  validate(total) {
    const advance = parseFloat(this.advanceInput.value) || 0;
    if (advance < 0) return 'Advance amount cannot be negative.';
    if (advance > total) return 'Advance cannot exceed total amount.';
    return null;
  }
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
