import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/terms" className="back-btn">←</Link>
        <h1>Privacy Policy</h1>
      </header>

      <div className="legal-content">
        <p className="legal-updated">Last updated: July 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide during registration including name, phone number, location, skills, and business details.</p>
        </section>

        <section>
          <h2>2. How We Use Information</h2>
          <p>Your information is used to match workers with nearby jobs and businesses, display profiles, and facilitate hire requests.</p>
        </section>

        <section>
          <h2>3. Location Data</h2>
          <p>With your permission, we use location data to show nearby matches within 12 km. Location is stored locally on your device.</p>
        </section>

        <section>
          <h2>4. Data Storage</h2>
          <p>Currently, data is stored locally on your device. When a backend is connected, data will be stored securely on our servers.</p>
        </section>

        <section>
          <h2>5. Sharing</h2>
          <p>Your profile information is visible to matched workers or employers on the platform. We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>You can update or delete your profile at any time. Contact support@hyrlo.com for data deletion requests.</p>
        </section>

        <p className="legal-link">
          See also our <Link to="/terms">Terms & Conditions</Link>
        </p>
      </div>
    </div>
  );
}
