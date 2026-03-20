import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Envosta collects, uses, and protects your personal information.',
  alternates: { canonical: 'https://envosta.com/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <section className="page-hero">
        <div className="c">
          <h1>Privacy Policy</h1>
          <p>This policy explains what data we collect, how we use it, and the choices you have regarding your personal information.</p>
          <div className="meta">Last updated: January 15, 2026</div>
          <hr className="divider" />
        </div>
      </section>

      <div className="legal-zone">
        <div className="legal-wrap legal-content">

          <h2>Information We Collect</h2>
          <p>We collect information to provide and improve our hosting services. The types of information we collect include:</p>
          <h3>Information You Provide</h3>
          <ul>
            <li>Account registration details (name, email address, billing address)</li>
            <li>Payment and billing information (processed securely through our payment providers)</li>
            <li>Support requests and communications with our team</li>
            <li>Domain registration details, if applicable</li>
            <li>Any content you upload to servers we manage on your behalf</li>
          </ul>
          <h3>Information Collected Automatically</h3>
          <ul>
            <li>Log data (IP address, browser type, operating system, referring URLs)</li>
            <li>Device information (hardware model, operating system version)</li>
            <li>Usage data (pages visited, features used, time spent on our platform)</li>
            <li>Performance and diagnostic data from your hosted websites</li>
            <li>Cookies and similar tracking technologies (see Section 4)</li>
          </ul>
          <h3>Information from Third Parties</h3>
          <ul>
            <li>Payment processors (transaction confirmation, fraud prevention data)</li>
            <li>Analytics providers (aggregated usage statistics)</li>
            <li>Domain registrars (WHOIS information for domains registered through us)</li>
          </ul>
          <hr className="legal-divider" />

          <h2>How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To provide, maintain, and improve our managed WordPress hosting services</li>
            <li>To process transactions and send related billing information</li>
            <li>To respond to your support requests and provide technical assistance</li>
            <li>To send service-related announcements (e.g., maintenance windows, security updates)</li>
            <li>To monitor and improve the performance, security, and reliability of our infrastructure</li>
            <li>To detect, prevent, and address fraud, abuse, and security issues</li>
            <li>To comply with legal obligations and enforce our Terms of Service</li>
            <li>To send marketing communications (only with your consent; you can opt out at any time)</li>
            <li>To personalize your experience and provide tailored recommendations</li>
          </ul>
          <hr className="legal-divider" />

          <h2>Information Sharing &amp; Disclosure</h2>
          <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
          <ul>
            <li><strong>Service Providers:</strong> We work with trusted third-party providers (payment processors, CDN providers, data centers) who need access to your information to perform services on our behalf. These providers are bound by contractual obligations to keep your data secure and confidential.</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law, regulation, legal process, or governmental request.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. We will notify you of any such change.</li>
            <li><strong>With Your Consent:</strong> We may share information with third parties when you give us explicit permission to do so.</li>
            <li><strong>Aggregated Data:</strong> We may share anonymized, aggregated data that cannot reasonably be used to identify you.</li>
          </ul>
          <hr className="legal-divider" />

          <h2>Cookies &amp; Tracking Technologies</h2>
          <p>We use cookies and similar technologies to enhance your experience on our website and platform.</p>
          <h3>Essential Cookies</h3>
          <p>These are required for our platform to function properly, including authentication, session management, and security features. You cannot opt out of essential cookies.</p>
          <h3>Analytics Cookies</h3>
          <p>We use analytics tools (such as Google Analytics) to understand how visitors interact with our website. These cookies collect aggregated, anonymous data to help us improve our services.</p>
          <h3>Marketing Cookies</h3>
          <p>With your consent, we may use marketing cookies to deliver relevant advertisements and measure campaign effectiveness. You can manage your cookie preferences at any time through your browser settings or our cookie consent banner.</p>
          <h3>Managing Cookies</h3>
          <p>Most web browsers allow you to control cookies through their settings. You can set your browser to refuse cookies or alert you when cookies are being sent. Please note that disabling certain cookies may affect the functionality of our platform.</p>
          <hr className="legal-divider" />

          <h2>Data Retention</h2>
          <p>We retain your personal information for as long as your account is active or as needed to provide you with our services. We may also retain certain information as required by law, to resolve disputes, enforce our agreements, or for legitimate business purposes.</p>
          <p>When you close your account, we will delete or anonymize your personal data within 90 days, except where retention is required by law or for legitimate business purposes (such as fraud prevention).</p>
          <p>Backup data stored on our infrastructure is automatically purged within 30 days of account closure.</p>
          <hr className="legal-divider" />

          <h2>Data Security</h2>
          <p>We take the security of your data seriously and implement industry-standard measures to protect it, including:</p>
          <ul>
            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication mechanisms for our staff</li>
            <li>DDoS protection and web application firewalls</li>
            <li>24/7 monitoring for unauthorized access or suspicious activity</li>
            <li>Automated daily backups with secure offsite storage</li>
          </ul>
          <p>While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security but are committed to maintaining the highest standards.</p>
          <hr className="legal-divider" />

          <h2>Your Rights &amp; Choices</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Request that we delete your personal information, subject to certain exceptions.</li>
            <li><strong>Portability:</strong> Request a machine-readable copy of your data to transfer to another provider.</li>
            <li><strong>Objection:</strong> Object to our processing of your personal data for certain purposes.</li>
            <li><strong>Restriction:</strong> Request that we restrict the processing of your data in certain circumstances.</li>
            <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
          </ul>
          <p>To exercise any of these rights, please contact us at <a href="mailto:privacy@envosta.com">privacy@envosta.com</a>. We will respond to your request within 30 days.</p>
          <hr className="legal-divider" />

          <h2>International Data Transfers</h2>
          <p>Our servers and data centers are located in the United States and Europe. If you access our services from outside these regions, your information may be transferred to and processed in countries with different data protection laws than your own.</p>
          <p>We ensure appropriate safeguards are in place for international data transfers, including Standard Contractual Clauses (SCCs) approved by the European Commission where applicable.</p>
          <hr className="legal-divider" />

          <h2>Children&apos;s Privacy</h2>
          <p>Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that a child under 16 has provided us with personal data, we will take steps to delete such information promptly.</p>
          <hr className="legal-divider" />

          <h2>Third-Party Services</h2>
          <p>Our platform may contain links to third-party websites or integrate with third-party services (such as payment processors, analytics tools, or plugins). This Privacy Policy does not apply to third-party services, and we are not responsible for their privacy practices.</p>
          <p>We encourage you to review the privacy policies of any third-party services you interact with.</p>
          <hr className="legal-divider" />

          <h2>Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. When we make material changes, we will notify you by email or by posting a prominent notice on our website prior to the changes taking effect.</p>
          <p>We encourage you to review this page periodically to stay informed about how we protect your data.</p>
          <hr className="legal-divider" />

          <h2>Contact Us</h2>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:privacy@envosta.com">privacy@envosta.com</a></li>
            <li><strong>Support:</strong> <a href="https://envosta.com/support">Contact our support team</a></li>
            <li><strong>Mail:</strong> Envosta Inc., Privacy Team, 123 Hosting Lane, Suite 400, San Francisco, CA 94105</li>
          </ul>
          <p>We will make every effort to respond to your inquiry within 30 business days.</p>

        </div>
      </div>
    </>
  );
}
