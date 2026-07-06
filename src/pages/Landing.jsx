import { Link } from 'react-router-dom';
import { Briefcase, Users, MapPin, Shield } from 'lucide-react';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-logo">Hyrlo</div>
        <h1>Find local work.<br />Hire trusted workers.</h1>
        <p className="landing-tagline">
          Hyperlocal hiring platform connecting workers and businesses within your neighbourhood.
        </p>
      </div>

      <div className="landing-features">
        <div className="feature-item">
          <Briefcase size={20} />
          <span>Find local jobs</span>
        </div>
        <div className="feature-item">
          <Users size={20} />
          <span>Hire trusted workers</span>
        </div>
        <div className="feature-item">
          <MapPin size={20} />
          <span>Fast nearby matching</span>
        </div>
        <div className="feature-item">
          <Shield size={20} />
          <span>Safe verified profiles</span>
        </div>
      </div>

      <div className="landing-actions">
        <Link to="/onboard/worker/basic" className="btn btn-primary btn-lg">
          Find Work
        </Link>
        <Link to="/onboard/employer/owner" className="btn btn-accent btn-lg">
          Hire Workers
        </Link>
      </div>

      <p className="landing-footer">
        Already registered?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
