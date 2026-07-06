import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="back-btn">←</Link>
        <h1>Terms & Conditions</h1>
      </header>

      <div className="legal-content">
        <p className="legal-updated">Last updated: July 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Hyrlo, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform.</p>
        </section>

        <section>
          <h2>2. Platform Description</h2>
          <p>Hyrlo is a hyperlocal hiring platform that connects workers with businesses and employers in their locality. We facilitate introductions but are not a party to any employment agreement.</p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account information. You must provide accurate and complete information during registration.</p>
        </section>

        <section>
          <h2>4. Worker Responsibilities</h2>
          <p>Workers must provide truthful information about their skills, experience, and availability. Misrepresentation may result in account suspension.</p>
        </section>

        <section>
          <h2>5. Employer Responsibilities</h2>
          <p>Employers must provide accurate business information and comply with applicable labour laws when hiring workers through the platform.</p>
        </section>

        <section>
          <h2>6. Payments</h2>
          <p>Hyrlo does not process payments between workers and employers. All payment terms are agreed directly between parties.</p>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>Hyrlo is provided "as is" without warranties. We are not liable for disputes, damages, or losses arising from platform use.</p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>For questions about these terms, contact us at support@hyrlo.com</p>
        </section>

        <p className="legal-link">
          See also our <Link to="/privacy">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
