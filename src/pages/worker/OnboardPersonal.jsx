import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getOnboarding, saveOnboarding } from '../../services/storage';
import { FormField } from '../../components/UI';

export default function WorkerPersonal() {
  const navigate = useNavigate();
  const existing = getOnboarding();
  const [form, setForm] = useState({ email: existing.email || '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    saveOnboarding({ email: form.email });
    navigate('/onboard/worker/work');
  };

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">←</button>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '50%' }} /></div>
        <span className="step-label">Step 2 of 4</span>
      </div>
      <h2>Personal Details</h2>
      <p className="onboard-sub">Optional contact information</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <FormField label="Email (optional)" error={errors.email}>
          <input value={form.email} onChange={(e) => setForm({ email: e.target.value })} placeholder="your@email.com" type="email" />
        </FormField>
        <div className="info-box">
          <p>Name: <strong>{existing.fullName}</strong></p>
          <p>Phone: <strong>{existing.phone}</strong></p>
          <p>Gender: <strong>{existing.gender}</strong> · Age: <strong>{existing.age}</strong></p>
        </div>
        <button type="submit" className="btn btn-primary btn-lg btn-block">Continue</button>
      </form>
    </div>
  );
}
