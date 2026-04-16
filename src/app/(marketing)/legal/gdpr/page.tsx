import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDPR Compliance',
  description: 'How Envosta protects your data and upholds your rights under the General Data Protection Regulation.',
  alternates: { canonical: 'https://envosta.com/legal/gdpr' },
};

export default function GdprPage() {
  return (
    <>
      <section className="legal-hero">
        <div className="c">
          <h1>GDPR Compliance</h1>
          <p>How Envosta protects your data and upholds your rights under the General Data Protection Regulation.</p>
          <div className="meta">Last updated: January 15, 2026</div>
        </div>
      </section>

      <div className="legal-zone">
        <section className="legal-content">
          <div className="legal-wrap">

            <h2 id="overview">Overview &amp; Commitment</h2>
            <p>Envosta is committed to protecting the privacy and security of personal data for all users, including those in the European Economic Area (EEA), the United Kingdom, and Switzerland. We comply with the General Data Protection Regulation (EU) 2016/679 (&quot;GDPR&quot;) and the UK GDPR.</p>
            <p>This page outlines how we meet our obligations as both a <strong>data controller</strong> (when we process your account and billing information) and a <strong>data processor</strong> (when we host and manage your WordPress sites and handle data on your behalf).</p>

            <div className="gdpr-banner">
              <div className="banner-icon">&#128274;</div>
              <div className="banner-text">
                <h4>Our Promise</h4>
                <p>We process personal data lawfully, fairly, and transparently. We collect only what is necessary, keep it accurate, and protect it with industry-leading security measures.</p>
              </div>
            </div>
            <hr className="legal-divider" />

            <h2 id="scope">Scope &amp; Applicability</h2>
            <p>This GDPR compliance page applies to all personal data processed by Envosta in connection with our managed WordPress hosting services, including:</p>
            <ul>
              <li>Visitors to our website at envosta.com</li>
              <li>Customers who sign up for and use our hosting plans</li>
              <li>Contacts who reach out to our sales or support teams</li>
              <li>End users of websites hosted on the Envosta platform</li>
            </ul>
            <p>If you are an Envosta customer hosting a website that collects personal data from your own visitors, you act as the data controller for that data, and Envosta acts as the data processor. Our <a href="#dpa">Data Processing Agreement</a> governs that relationship.</p>
            <hr className="legal-divider" />

            <h2 id="lawful-basis">Lawful Basis for Processing</h2>
            <p>Under GDPR, we must have a valid legal basis for processing your personal data. Depending on the context, we rely on one or more of the following:</p>
            <ul>
              <li><strong>Contractual Necessity (Article 6(1)(b)):</strong> Processing required to deliver the hosting services you have purchased, manage your account, and provide technical support.</li>
              <li><strong>Legitimate Interest (Article 6(1)(f)):</strong> Processing needed to maintain platform security, prevent fraud, improve our services, and communicate relevant product updates. We balance our interests against your rights and freedoms.</li>
              <li><strong>Consent (Article 6(1)(a)):</strong> When you opt in to receive marketing emails, participate in surveys, or enable optional analytics. You may withdraw consent at any time.</li>
              <li><strong>Legal Obligation (Article 6(1)(c)):</strong> Processing required to comply with applicable laws, such as tax regulations, anti-money laundering requirements, and law enforcement requests.</li>
            </ul>
            <hr className="legal-divider" />

            <h2 id="data-collected">Data We Collect &amp; Process</h2>
            <p>We collect only the data necessary to provide our services. For a detailed breakdown of the specific data points, please refer to our <a href="/legal/privacy">Privacy Policy</a>. In summary:</p>

            <h3>As a Data Controller</h3>
            <ul>
              <li>Account details — name, email address, company name</li>
              <li>Billing information — processed securely via PCI-compliant payment providers</li>
              <li>Support communications — tickets, emails, and live chat transcripts</li>
              <li>Usage and analytics data — aggregated platform usage to improve our services</li>
            </ul>

            <h3>As a Data Processor</h3>
            <ul>
              <li>Website content and databases hosted on your Envosta server</li>
              <li>Visitor data collected by your WordPress site (e.g., form submissions, comments, WooCommerce orders)</li>
              <li>Server logs generated by traffic to your hosted sites</li>
            </ul>
            <p>We do not access, use, or share the data stored on your hosted sites unless explicitly instructed by you (for example, during a support request or migration).</p>
            <hr className="legal-divider" />

            <h2 id="your-rights">Your Rights Under GDPR</h2>
            <p>If you are located in the EEA, UK, or Switzerland, the GDPR grants you the following rights over your personal data. You can exercise any of these by contacting us at <a href="mailto:privacy@envosta.com">privacy@envosta.com</a>.</p>

            <div className="gdpr-rights-grid">
              <div className="gdpr-right-card">
                <div className="icon">&#128196;</div>
                <h4>Right of Access</h4>
                <p>Request a copy of the personal data we hold about you and information about how it is processed.</p>
              </div>
              <div className="gdpr-right-card">
                <div className="icon">&#9998;</div>
                <h4>Right to Rectification</h4>
                <p>Request correction of inaccurate or incomplete personal data we hold about you.</p>
              </div>
              <div className="gdpr-right-card">
                <div className="icon">&#128465;</div>
                <h4>Right to Erasure</h4>
                <p>Request deletion of your personal data when it is no longer necessary or when you withdraw consent.</p>
              </div>
              <div className="gdpr-right-card">
                <div className="icon">&#9208;</div>
                <h4>Right to Restriction</h4>
                <p>Request that we limit the processing of your data in certain circumstances while issues are resolved.</p>
              </div>
              <div className="gdpr-right-card">
                <div className="icon">&#128230;</div>
                <h4>Right to Portability</h4>
                <p>Receive your data in a structured, machine-readable format and transfer it to another provider.</p>
              </div>
              <div className="gdpr-right-card">
                <div className="icon">&#9995;</div>
                <h4>Right to Object</h4>
                <p>Object to processing based on legitimate interests, including profiling and direct marketing.</p>
              </div>
            </div>

            <p>We respond to all data subject requests within <strong>30 days</strong>. If we need more time due to the complexity of the request, we will notify you within the initial 30-day period and may extend by up to two additional months as permitted under GDPR.</p>
            <p>To verify your identity and protect against unauthorized requests, we may ask you to confirm your account details before processing your request.</p>
            <hr className="legal-divider" />

            <h2 id="data-protection">Data Protection Measures</h2>
            <p>We implement comprehensive technical and organizational measures to protect personal data against unauthorized access, loss, alteration, or destruction:</p>

            <h3>Technical Measures</h3>
            <ul>
              <li><strong>Encryption:</strong> All data in transit is encrypted using TLS 1.3. Data at rest is encrypted using AES-256.</li>
              <li><strong>Infrastructure:</strong> Our servers are hosted in SOC 2 Type II certified data centers in the EU and US.</li>
              <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication for all internal systems.</li>
              <li><strong>Monitoring:</strong> 24/7 intrusion detection, DDoS mitigation, and real-time security monitoring.</li>
              <li><strong>Backups:</strong> Automated daily backups with encrypted offsite storage and tested disaster recovery procedures.</li>
            </ul>

            <h3>Organizational Measures</h3>
            <ul>
              <li>Regular data protection training for all employees and contractors</li>
              <li>Internal data protection policies and incident response procedures</li>
              <li>Periodic security audits and penetration testing by independent third parties</li>
              <li>Data minimization practices — we only collect and retain what is strictly necessary</li>
            </ul>
            <hr className="legal-divider" />

            <h2 id="international-transfers">International Data Transfers</h2>
            <p>Envosta operates data centers in the European Union and the United States. When personal data is transferred outside the EEA, we ensure that appropriate safeguards are in place as required by GDPR Chapter V:</p>
            <ul>
              <li><strong>Standard Contractual Clauses (SCCs):</strong> We use the European Commission&apos;s approved SCCs for transfers to countries without an adequacy decision.</li>
              <li><strong>EU-U.S. Data Privacy Framework:</strong> Where applicable, we rely on the EU-U.S. Data Privacy Framework for transfers to certified U.S. organizations.</li>
              <li><strong>Data residency options:</strong> All customers can choose to keep their data within EU-based data centers by selecting the Amsterdam (EU West) region during setup.</li>
            </ul>
            <p>You can request information about the specific safeguards applied to transfers of your data by contacting <a href="mailto:privacy@envosta.com">privacy@envosta.com</a>.</p>
            <hr className="legal-divider" />

            <h2 id="sub-processors">Sub-Processors &amp; Third Parties</h2>
            <p>We use a limited number of sub-processors to help deliver our services. Each sub-processor is vetted for GDPR compliance and bound by a Data Processing Agreement. Key sub-processors include:</p>
            <ul>
              <li><strong>Cloud Infrastructure:</strong> Data center and server providers located in the EU and US</li>
              <li><strong>Payment Processing:</strong> PCI DSS Level 1 certified payment processors</li>
              <li><strong>CDN &amp; Performance:</strong> Content delivery network providers with global edge locations</li>
              <li><strong>Support Tools:</strong> Helpdesk and communication platforms for customer support</li>
              <li><strong>Analytics:</strong> Privacy-focused analytics tools for aggregated platform insights</li>
            </ul>
            <p>We maintain an up-to-date list of sub-processors. Customers who have signed a DPA will be notified at least <strong>30 days in advance</strong> of any new sub-processor being added, giving you the opportunity to object.</p>
            <hr className="legal-divider" />

            <h2 id="data-retention">Data Retention &amp; Deletion</h2>
            <p>We retain personal data only for as long as it is necessary to fulfill the purposes for which it was collected:</p>
            <ul>
              <li><strong>Active accounts:</strong> Data is retained for the duration of your account and service agreement.</li>
              <li><strong>After account closure:</strong> Core account data is deleted within 90 days. Backups containing account data are purged within 30 days of account closure.</li>
              <li><strong>Billing records:</strong> Retained for up to 7 years as required by tax and financial regulations.</li>
              <li><strong>Support tickets:</strong> Retained for 2 years after resolution for quality assurance purposes, then deleted.</li>
              <li><strong>Server logs:</strong> Automatically rotated and deleted after 90 days.</li>
            </ul>
            <p>If you request erasure of your data under Article 17, we will delete your personal data within 30 days, except where retention is required by law or for the establishment, exercise, or defense of legal claims.</p>
            <hr className="legal-divider" />

            <h2 id="breach-notification">Data Breach Notification</h2>
            <p>In the event of a personal data breach, Envosta follows a strict incident response protocol in line with GDPR Articles 33 and 34:</p>
            <ul>
              <li><strong>Supervisory Authority:</strong> We will notify the relevant supervisory authority within <strong>72 hours</strong> of becoming aware of a breach that is likely to result in a risk to the rights and freedoms of individuals.</li>
              <li><strong>Affected Individuals:</strong> If a breach is likely to result in a <strong>high risk</strong> to your rights and freedoms, we will notify you directly without undue delay.</li>
              <li><strong>Customers (as processor):</strong> If a breach affects data we process on your behalf, we will notify you within <strong>48 hours</strong> so you can fulfill your own controller obligations.</li>
            </ul>
            <p>All breach notifications will include the nature of the breach, the categories of data affected, the likely consequences, and the measures taken or proposed to address the incident.</p>
            <hr className="legal-divider" />

            <h2 id="dpo">Data Protection Officer</h2>
            <p>Envosta has appointed a Data Protection Officer (DPO) to oversee our GDPR compliance program. You can contact our DPO for any questions or concerns about how we handle personal data:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:dpo@envosta.com">dpo@envosta.com</a></li>
              <li><strong>Mail:</strong> Data Protection Officer, Envosta Inc., Calgary, Alberta, Canada</li>
            </ul>
            <p>Our DPO is responsible for monitoring compliance, conducting Data Protection Impact Assessments (DPIAs) where required, and serving as the point of contact for supervisory authorities.</p>
            <hr className="legal-divider" />

            <h2 id="complaints">Complaints &amp; Supervisory Authority</h2>
            <p>If you believe that our processing of your personal data violates the GDPR, you have the right to lodge a complaint with a supervisory authority. You may contact:</p>
            <ul>
              <li>The supervisory authority in the EU member state of your habitual residence, place of work, or place of the alleged infringement</li>
              <li>Your local <strong>EU Data Protection Authority</strong> — as Envosta is based outside the EU, you may contact the supervisory authority in your member state</li>
              <li>The <strong>UK Information Commissioner&apos;s Office (ICO)</strong> if you are based in the United Kingdom</li>
            </ul>
            <p>Before filing a complaint, we encourage you to contact us first at <a href="mailto:dpo@envosta.com">dpo@envosta.com</a> so we can address your concerns directly and resolve any issues promptly.</p>
            <hr className="legal-divider" />

            <h2 id="dpa">Data Processing Agreement</h2>
            <p>If you are an Envosta customer and require a Data Processing Agreement (DPA) for GDPR compliance, we provide a pre-signed DPA that covers:</p>
            <ul>
              <li>The nature and purpose of data processing</li>
              <li>Categories of personal data and data subjects</li>
              <li>Obligations and rights of the controller and processor</li>
              <li>Sub-processor management and notification procedures</li>
              <li>Data security obligations and breach notification commitments</li>
              <li>Data return and deletion upon termination of services</li>
              <li>Standard Contractual Clauses (SCCs) as an annex for international transfers</li>
            </ul>

            <div className="gdpr-banner">
              <div className="banner-icon">&#128221;</div>
              <div className="banner-text">
                <h4>Request a DPA</h4>
                <p>To obtain a signed copy of our Data Processing Agreement, contact us at <a href="mailto:privacy@envosta.com">privacy@envosta.com</a> or through your account dashboard under Settings &rarr; Legal Documents.</p>
              </div>
            </div>
            <hr className="legal-divider" />

            <h2 id="updates">Updates to This Page</h2>
            <p>We may update this GDPR compliance page from time to time to reflect changes in our practices, our sub-processor list, or applicable regulations. When material changes are made, we will notify affected customers by email and post a notice on our website at least 30 days before the changes take effect.</p>
            <p>We encourage you to review this page periodically. For any questions about updates, please contact <a href="mailto:dpo@envosta.com">dpo@envosta.com</a>.</p>

          </div>
        </section>
      </div>
    </>
  );
}
