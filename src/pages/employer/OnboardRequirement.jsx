import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveOnboarding } from '../../services/storage';
import { validateEmployerRequirement, hasErrors } from '../../utils/validation';
import { FormField, Toggle } from '../../components/UI';

export default function EmployerRequirement() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ requirement: '', needWorker: true });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateEmployerRequirement(form);
    setErrors(errs);
    if (hasErrors(errs)) return;
    saveOnboarding(form);
    navigate('/onboard/employer/location');
  };

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">←</button>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '75%' }} /></div>
        <span className="step-label">Step 3 of 4</span>
      </div>
      <h2>Worker Requirement</h2>
      <p className="onboard-sub">What kind of worker are you looking for?</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <FormField label="Describe your requirement" error={errors.requirement}>
          <textarea value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="e.g. Need experienced cook for morning shift" rows={4} />
        </FormField>
        <Toggle checked={form.needWorker} onChange={(v) => setForm({ ...form, needWorker: v })} label="Actively Hiring / Need Worker" />
        <button type="submit" className="btn btn-accent btn-lg btn-block">Continue</button>
      </form>
    </div>
  );
}
