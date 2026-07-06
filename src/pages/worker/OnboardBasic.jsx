import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveOnboarding } from '../../services/storage';
import { validateWorkerBasic, hasErrors } from '../../utils/validation';
import { FormField } from '../../components/UI';
import { Link } from 'react-router-dom';

export default function WorkerBasic() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', age: '', gender: '', termsAccepted: false });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateWorkerBasic(form);
    setErrors(errs);
    if (hasErrors(errs)) return;
    saveOnboarding({ role: 'worker', ...form });
    navigate('/onboard/worker/personal');
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <Link to="/" className="back-btn">←</Link>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '25%' }} /></div>
        <span className="step-label">Step 1 of 4</span>
      </div>
      <h2>Basic Details</h2>
      <p className="onboard-sub">Tell us about yourself to get started</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <FormField label="Full Name" error={errors.fullName}>
          <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Your full name" />
        </FormField>
        <FormField label="Phone Number" error={errors.phone}>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile number" type="tel" maxLength={10} />
        </FormField>
        <FormField label="Age" error={errors.age}>
          <input value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="Your age" type="number" min={16} max={70} />
        </FormField>
        <FormField label="Gender" error={errors.gender}>
          <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </FormField>
        <FormField error={errors.termsAccepted}>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.termsAccepted} onChange={(e) => set('termsAccepted', e.target.checked)} />
            <span>I agree to the <Link to="/terms" target="_blank">Terms & Conditions</Link></span>
          </label>
        </FormField>
        <button type="submit" className="btn btn-primary btn-lg btn-block">Continue</button>
      </form>
    </div>
  );
}
