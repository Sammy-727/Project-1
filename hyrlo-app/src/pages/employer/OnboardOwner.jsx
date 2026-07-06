import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saveOnboarding } from '../../services/storage';
import { validateEmployerOwner, hasErrors } from '../../utils/validation';
import { FormField } from '../../components/UI';

export default function EmployerOwner() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ownerName: '', phone: '', termsAccepted: false });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateEmployerOwner(form);
    setErrors(errs);
    if (hasErrors(errs)) return;
    saveOnboarding({ role: 'employer', ...form });
    navigate('/onboard/employer/business');
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <Link to="/" className="back-btn">←</Link>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '25%' }} /></div>
        <span className="step-label">Step 1 of 4</span>
      </div>
      <h2>Business Owner</h2>
      <p className="onboard-sub">Your contact details as the business owner</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <FormField label="Owner Name" error={errors.ownerName}>
          <input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Your full name" />
        </FormField>
        <FormField label="Phone Number" error={errors.phone}>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile number" type="tel" maxLength={10} />
        </FormField>
        <FormField error={errors.termsAccepted}>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.termsAccepted} onChange={(e) => set('termsAccepted', e.target.checked)} />
            <span>I agree to the <Link to="/terms" target="_blank">Terms & Conditions</Link></span>
          </label>
        </FormField>
        <button type="submit" className="btn btn-accent btn-lg btn-block">Continue</button>
      </form>
    </div>
  );
}
