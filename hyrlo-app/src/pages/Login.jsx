import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getWorkers, getBusinesses } from '../services/storage';
import { useApp } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, refresh } = useApp();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    const worker = getWorkers().find((w) => w.phone === cleaned);
    const business = getBusinesses().find((b) => b.phone === cleaned);

    if (worker) {
      login({ id: worker.id, role: 'worker' });
      refresh();
      navigate('/worker/jobs');
    } else if (business) {
      login({ id: business.id, role: 'employer' });
      refresh();
      navigate('/employer/dashboard');
    } else {
      setError('No account found with this phone. Please register first.');
    }
  };

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <Link to="/" className="back-btn">←</Link>
      </div>
      <h2>Sign In</h2>
      <p className="onboard-sub">Enter your registered phone number</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <div className="form-field">
          <label>Phone Number</label>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }} placeholder="10-digit mobile number" type="tel" maxLength={10} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <button type="submit" className="btn btn-primary btn-lg btn-block">Sign In</button>
      </form>

      <div className="login-hints">
        <p><strong>Demo accounts:</strong></p>
        <p>Worker: 9876543210 (Rajesh Kumar)</p>
        <p>Employer: 9988776655 (City Medical Store)</p>
      </div>
    </div>
  );
}
