import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveOnboarding } from '../../services/storage';
import { CATEGORIES, SPECIALIZATIONS } from '../../constants/categories';
import { validateWorkerWork, hasErrors } from '../../utils/validation';
import { FormField, Toggle } from '../../components/UI';

export default function WorkerWork() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: '', specialization: '', skills: '', experience: '',
    expectedPay: '', needWork: true,
  });
  const [errors, setErrors] = useState({});

  const specs = form.category ? SPECIALIZATIONS[form.category] || [] : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateWorkerWork(form);
    setErrors(errs);
    if (hasErrors(errs)) return;
    saveOnboarding(form);
    navigate('/onboard/worker/location');
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">←</button>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '75%' }} /></div>
        <span className="step-label">Step 3 of 4</span>
      </div>
      <h2>Work Details</h2>
      <p className="onboard-sub">What kind of work are you looking for?</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <FormField label="Category" error={errors.category}>
          <select value={form.category} onChange={(e) => { set('category', e.target.value); set('specialization', ''); }}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Specialization" error={errors.specialization}>
          <select value={form.specialization} onChange={(e) => set('specialization', e.target.value)} disabled={!form.category}>
            <option value="">Select specialization</option>
            {specs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Skills" error={errors.skills}>
          <input value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="e.g. Wiring, AC Repair" />
        </FormField>
        <FormField label="Experience (years)" error={errors.experience}>
          <input value={form.experience} onChange={(e) => set('experience', e.target.value)} type="number" min={0} max={50} placeholder="Years of experience" />
        </FormField>
        <FormField label="Expected Pay" error={errors.expectedPay}>
          <input value={form.expectedPay} onChange={(e) => set('expectedPay', e.target.value)} placeholder="e.g. ₹800/day or ₹15,000/month" />
        </FormField>
        <Toggle checked={form.needWork} onChange={(v) => set('needWork', v)} label="I Need Work" />
        <button type="submit" className="btn btn-primary btn-lg btn-block">Continue</button>
      </form>
    </div>
  );
}
