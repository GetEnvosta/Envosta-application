import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Learn how Envosta uses cookies and similar technologies to provide, protect, and improve our services.',
  alternates: { canonical: 'https://envosta.com/legal/cookies' },
};

export default function CookiesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="c">
          <h1>Cookie Policy</h1>
          <p>Learn how Envosta uses cookies and similar technologies to provide, protect, and improve our services.</p>
          <div className="meta">Last updated: January 15, 2026</div>
          <hr className="divider" />
        </div>
      </section>

      <div className="legal-zone">
        <section className="legal-content">
          <div className="c">
            <div className="legal-wrap">

              <h2>What Are Cookies?</h2>
              <p>Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give site owners useful information about how their site is being used.</p>
              <p>Cookies can be &quot;first-party&quot; (set by the website you are visiting) or &quot;third-party&quot; (set by a different domain than the one you are visiting). They can also be &quot;session&quot; cookies (deleted when you close your browser) or &quot;persistent&quot; cookies (remaining on your device for a set period or until you delete them manually).</p>
              <p>In addition to cookies, we may also use similar technologies such as pixel tags, web beacons, local storage, and device fingerprinting. References to &quot;cookies&quot; in this policy include these similar technologies unless stated otherwise.</p>
              <hr className="legal-divider" />

              <h2>How We Use Cookies</h2>
              <p>Envosta uses cookies and similar technologies for the following general purposes:</p>
              <ul>
                <li><strong>Authentication:</strong> To recognize you when you sign in and maintain your session securely across our platform and dashboard.</li>
                <li><strong>Security:</strong> To protect your account from unauthorized access, detect suspicious activity, and prevent fraud.</li>
                <li><strong>Preferences:</strong> To remember your settings, language preferences, and configuration choices so you don&apos;t have to re-enter them.</li>
                <li><strong>Analytics:</strong> To understand how visitors interact with our website and hosting dashboard so we can improve performance and usability.</li>
                <li><strong>Performance:</strong> To monitor the speed and reliability of our website and ensure content loads efficiently via our CDN.</li>
                <li><strong>Marketing:</strong> To deliver relevant content and measure the effectiveness of our advertising campaigns (only with your consent).</li>
              </ul>
              <hr className="legal-divider" />

              <h2>Types of Cookies We Use</h2>
              <p>We categorize the cookies on our website into four groups. Below is a summary, followed by detailed tables for each category in the sections that follow.</p>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for the website and dashboard to function. These cannot be disabled.</li>
                <li><strong>Analytics &amp; Performance Cookies:</strong> Help us understand traffic patterns and improve site speed. Enabled by default but can be opted out.</li>
                <li><strong>Functional Cookies:</strong> Enable enhanced features like saved preferences and personalized content.</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant ads and measure campaign performance. Only set with your explicit consent.</li>
              </ul>
              <hr className="legal-divider" />

              <h2>Essential Cookies</h2>
              <p>These cookies are strictly necessary for the operation of our website and hosting platform. They enable core functionality such as secure login, session management, and access to your hosting dashboard. Because they are essential, they cannot be disabled through our cookie preference center.</p>
              <table className="cookie-table">
                <thead>
                  <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>envosta_session</code></td><td>Maintains your authenticated session across the platform</td><td>Session</td></tr>
                  <tr><td><code>envosta_csrf</code></td><td>Protects against cross-site request forgery attacks</td><td>Session</td></tr>
                  <tr><td><code>envosta_cc</code></td><td>Stores your cookie consent preferences</td><td>12 months</td></tr>
                  <tr><td><code>__cf_bm</code></td><td>Cloudflare bot management — distinguishes humans from bots</td><td>30 minutes</td></tr>
                  <tr><td><code>envosta_lb</code></td><td>Load balancer routing to ensure consistent server connections</td><td>Session</td></tr>
                </tbody>
              </table>
              <hr className="legal-divider" />

              <h2>Analytics &amp; Performance Cookies</h2>
              <p>These cookies collect aggregated, anonymized information about how visitors use our website. They help us understand which pages are most popular, how users navigate between pages, and whether visitors encounter errors. We use this data to improve the performance and usability of our platform.</p>
              <table className="cookie-table">
                <thead>
                  <tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>_ga</code></td><td>Google Analytics</td><td>Distinguishes unique visitors and tracks sessions</td><td>2 years</td></tr>
                  <tr><td><code>_ga_*</code></td><td>Google Analytics</td><td>Maintains session state for GA4 measurement</td><td>2 years</td></tr>
                  <tr><td><code>_gid</code></td><td>Google Analytics</td><td>Distinguishes visitors within a 24-hour window</td><td>24 hours</td></tr>
                  <tr><td><code>ph_*</code></td><td>PostHog</td><td>Product analytics — tracks feature usage and user flows</td><td>12 months</td></tr>
                </tbody>
              </table>
              <p>You can opt out of analytics cookies at any time using our cookie preference center or by adjusting your browser settings.</p>
              <hr className="legal-divider" />

              <h2>Functional Cookies</h2>
              <p>Functional cookies allow our website to remember choices you make (such as your preferred language, region, or dashboard layout) and provide enhanced, more personalized features. They may be set by us or by third-party providers whose services we have integrated into our pages.</p>
              <table className="cookie-table">
                <thead>
                  <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>envosta_prefs</code></td><td>Stores your dashboard layout and display preferences</td><td>12 months</td></tr>
                  <tr><td><code>envosta_lang</code></td><td>Remembers your selected language and locale</td><td>12 months</td></tr>
                  <tr><td><code>envosta_tz</code></td><td>Stores your timezone setting for accurate log timestamps</td><td>12 months</td></tr>
                  <tr><td><code>intercom-*</code></td><td>Powers live chat support and remembers your conversation history</td><td>9 months</td></tr>
                </tbody>
              </table>
              <p>If you disable functional cookies, some features of our platform may not work as intended.</p>
              <hr className="legal-divider" />

              <h2>Marketing &amp; Advertising Cookies</h2>
              <p>Marketing cookies are used to track visitors across websites and display ads that are relevant and engaging. These cookies are only placed on your device with your explicit consent. They help us measure the effectiveness of our advertising campaigns and limit the number of times you see a particular ad.</p>
              <table className="cookie-table">
                <thead>
                  <tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>_fbp</code></td><td>Meta (Facebook)</td><td>Tracks visits across websites for targeted advertising</td><td>3 months</td></tr>
                  <tr><td><code>_gcl_au</code></td><td>Google Ads</td><td>Stores conversion data for ad click attribution</td><td>3 months</td></tr>
                  <tr><td><code>li_fat_id</code></td><td>LinkedIn</td><td>Enables LinkedIn ad targeting and conversion tracking</td><td>30 days</td></tr>
                </tbody>
              </table>
              <p>You can withdraw your consent for marketing cookies at any time via our cookie preference center. Previously collected data may be retained in accordance with the respective provider&apos;s privacy policy.</p>
              <hr className="legal-divider" />

              <h2>Third-Party Cookies</h2>
              <p>Some cookies on our website are set by third-party services that we use to enhance your experience. These third parties have their own privacy and cookie policies, and we encourage you to review them:</p>
              <ul>
                <li><strong>Cloudflare:</strong> Provides CDN, DDoS protection, and bot management. <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare Privacy Policy</a></li>
                <li><strong>Google Analytics:</strong> Provides website analytics and reporting. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                <li><strong>Intercom:</strong> Powers our live chat and help center. <a href="https://www.intercom.com/legal/privacy" target="_blank" rel="noopener noreferrer">Intercom Privacy Policy</a></li>
                <li><strong>Stripe:</strong> Processes payments securely. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a></li>
              </ul>
              <p>We do not control the cookies set by third parties. Any information collected by third-party cookies is subject to the privacy policy of the respective third party.</p>
              <hr className="legal-divider" />

              <h2>Managing Your Cookie Preferences</h2>
              <p>You have several options for managing cookies:</p>
              <h3>Cookie Preference Center</h3>
              <p>You can adjust your cookie preferences at any time by clicking the &quot;Cookie Settings&quot; link in the footer of any page on our website. This allows you to enable or disable non-essential cookie categories.</p>
              <h3>Browser Settings</h3>
              <p>Most web browsers allow you to control cookies through their settings. You can typically find these in your browser&apos;s &quot;Options,&quot; &quot;Settings,&quot; or &quot;Preferences&quot; menu. The following links provide guidance for popular browsers:</p>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/manage-cookies-in-microsoft-edge-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
              </ul>
              <h3>Opt-Out Tools</h3>
              <p>You can opt out of interest-based advertising through the following industry tools:</p>
              <ul>
                <li><a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance (DAA)</a></li>
                <li><a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer">European Interactive Digital Advertising Alliance (EDAA)</a></li>
                <li><a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer">Network Advertising Initiative (NAI)</a></li>
              </ul>
              <p>Please note that disabling cookies may affect the functionality of our website and some features may not work as expected.</p>
              <hr className="legal-divider" />

              <h2>Cookie Retention Periods</h2>
              <p>The retention period for each cookie depends on its type and purpose. Session cookies are deleted automatically when you close your browser. Persistent cookies remain on your device until they expire or you delete them manually.</p>
              <p>We review the cookies we use on a regular basis and remove any that are no longer necessary. The specific retention periods for each cookie are listed in the tables above within Sections 4 through 7.</p>
              <p>Your cookie consent preferences (stored in <code>envosta_cc</code>) are retained for 12 months. After this period, you will be prompted to confirm your preferences again.</p>
              <hr className="legal-divider" />

              <h2>Changes to This Policy</h2>
              <p>We may update this Cookie Policy from time to time to reflect changes in the cookies we use, changes in technology, or for legal and regulatory reasons. When we make material changes, we will update the &quot;Last updated&quot; date at the top of this page and, where appropriate, notify you via a banner on our website.</p>
              <p>We encourage you to review this page periodically to stay informed about how we use cookies.</p>
              <hr className="legal-divider" />

              <h2>Contact Us</h2>
              <p>If you have any questions about our use of cookies or this Cookie Policy, please contact us:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:privacy@envosta.com">privacy@envosta.com</a></li>
                <li><strong>Support:</strong> <a href="https://envosta.com/support">Contact our support team</a></li>
                <li><strong>Mail:</strong> Envosta Inc., Privacy Team, 123 Hosting Lane, Suite 400, San Francisco, CA 94105</li>
              </ul>
              <p>For more details about how we handle your personal data, please see our <a href="/legal/privacy">Privacy Policy</a>.</p>

            </div>
          </div>
        </section>
      </div>
    </>
  );
}
