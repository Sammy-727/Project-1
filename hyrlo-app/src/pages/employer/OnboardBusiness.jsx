import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveOnboarding } from '../../services/storage';
import { CATEGORIES, SPECIALIZATIONS } from '../../constants/categories';
import { validateEmployerBusiness, hasErrors } from '../../utils/validation';
import { FormField } from '../../components/UI';

export default function EmployerBusiness() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: '', category: '', specialization: '',
    locality: 'Central Bangalore', address: 'MG Road, Bangalore',
  });
  const [errors, setErrors] = useState({});

  const specs = form.category ? SPECIALIZATIONS[form.category] || [] : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateEmployerBusiness(form);
    setErrors(errs);
    if (hasErrors(errs)) return;
    saveOnboarding(form);
    navigate('/onboard/employer/requirement');
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">←</button>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '50%' }} /></div>
        <span className="step-label">Step 2 of 4</span>
      </div>
      <h2>Business Details</h2>
      <p className="onboard-sub">Tell us about your business</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <FormField label="Business Name" error={errors.businessName}>
          <input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="Your business name" />
        </FormField>
        <FormField label="Category" error={errors.category}>
          <select value={form.category} onChange={(e) => { set('category', e.target.value); set('specialization', ''); }}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Specialization Needed" error={errors.specialization}>
          <select value={form.specialization} onChange={(e) => set('specialization', e.target.value)} disabled={!form.category}>
            <option value="">Select specialization</option>
            {specs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Location / Locality" error={errors.location}>
          <input value={form.locality} onChange={(e) => set('locality', e.target.value)} placeholder="Business area" />
        </FormField>
        <FormField label="Address">
          <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full business address" />
        </FormField>
        <button type="submit" className="btn btn-accent btn-lg btn-block">Continue</button>
      </form>
    </div>
  );
}
