import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using Envosta managed WordPress hosting services.',
  alternates: { canonical: 'https://envosta.com/legal/terms' },
};

export default function TermsPage() {
  return (
    <div className="legal-zone">

      <section className="page-hero">
        <div className="c">
          <div className="page-hero-inner">
            <h1>Terms of Service</h1>
            <p>Please read these terms carefully before using Envosta&apos;s managed WordPress hosting services and related products.</p>
            <span className="updated-badge">Last updated: March 1, 2026</span>
            <hr className="divider" />
          </div>
        </div>
      </section>

      <section>
        <div className="c">
          <div className="legal-wrap">
            <div className="legal-content">

              <h2 id="acceptance">Acceptance of Terms</h2>
              <p>By accessing or using the Envosta website, platform, hosting services, or any related tools (collectively, the &quot;Services&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind that entity.</p>
              <p>If you do not agree to these Terms, you must not access or use the Services. Your continued use of the Services following any changes to these Terms constitutes your acceptance of those changes.</p>
              <hr className="legal-divider" />

              <h2 id="eligibility">Eligibility</h2>
              <p>To use Envosta&apos;s Services, you must be at least 18 years of age or the legal age of majority in your jurisdiction, whichever is greater. By using the Services, you represent and warrant that you meet these eligibility requirements.</p>
              <p>If you are under 18, you may only use the Services under the supervision and with the consent of a parent or legal guardian who agrees to be bound by these Terms.</p>
              <hr className="legal-divider" />

              <h2 id="account">Account Registration</h2>
              <p>To access certain features of the Services, you must create an account. When registering, you agree to:</p>
              <ul>
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information to keep it accurate and complete</li>
                <li>Maintain the confidentiality of your account credentials and restrict access to your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify Envosta immediately of any unauthorized use of your account or any other breach of security</li>
              </ul>
              <p>Envosta reserves the right to suspend or terminate your account if any information provided is found to be inaccurate, misleading, or incomplete, or if your account is used in violation of these Terms.</p>
              <hr className="legal-divider" />

              <h2 id="services">Services &amp; Plans</h2>
              <p>Envosta provides managed WordPress hosting services, including but not limited to server provisioning, WordPress installation and management, performance optimization, security monitoring, automated backups, CDN integration, and related technical support.</p>
              <p>Services are provided according to the plan you select at the time of purchase. Each plan includes specific allocations for storage, bandwidth, site installations, and support levels. Details of current plans are available on our <a href="https://envosta.com/pricing">pricing page</a>.</p>
              <p>Envosta reserves the right to modify, suspend, or discontinue any aspect of the Services at any time. We will provide reasonable notice of any material changes that may affect your use of the Services.</p>
              <hr className="legal-divider" />

              <h2 id="payment">Payment &amp; Billing</h2>
              <p>By subscribing to a paid plan, you agree to pay all applicable fees as described on the pricing page at the time of purchase. All fees are quoted in US Dollars unless otherwise stated.</p>
              <p><strong>Billing cycles.</strong> Plans are available on monthly or annual billing cycles. Annual plans are billed upfront for the full year at a discounted rate — pay for 10 months, get 12 months of service.</p>
              <p><strong>Automatic renewal.</strong> Your subscription will automatically renew at the end of each billing cycle unless you cancel prior to the renewal date. Renewal will be charged at the then-current rate.</p>
              <p><strong>Refunds.</strong> All plans are covered by a 14-day money-back guarantee from the date of initial purchase. Monthly plans may be cancelled at any time but are not eligible for partial refunds for the current billing period.</p>
              <p><strong>Failed payments.</strong> If a payment fails, Envosta will attempt to process the charge again. If payment cannot be collected after reasonable attempts, your account may be suspended until the outstanding balance is resolved.</p>
              <p><strong>Taxes.</strong> You are responsible for any applicable taxes, duties, or government-imposed fees associated with your use of the Services, except where Envosta is legally required to collect and remit such taxes.</p>
              <hr className="legal-divider" />

              <h2 id="usage">Acceptable Use</h2>
              <p>You agree to use the Services in compliance with all applicable laws and regulations. The following activities are strictly prohibited:</p>
              <ul>
                <li>Hosting content that is illegal, defamatory, obscene, or infringes on the rights of others</li>
                <li>Distributing malware, viruses, or any other malicious code</li>
                <li>Sending unsolicited bulk email (spam) or engaging in phishing activities</li>
                <li>Attempting to gain unauthorized access to other systems, accounts, or networks</li>
                <li>Using the Services for cryptocurrency mining or other resource-intensive processes not related to web hosting</li>
                <li>Reselling, redistributing, or sublicensing the Services without written consent from Envosta</li>
                <li>Engaging in any activity that disrupts, degrades, or interferes with the Services or other users&apos; experience</li>
                <li>Hosting adult content, gambling operations, or any content promoting violence or hatred</li>
              </ul>
              <p>Envosta reserves the right to investigate and take appropriate action against violations of this policy, including suspending or terminating your account without prior notice or refund.</p>
              <hr className="legal-divider" />

              <h2 id="content">Your Content</h2>
              <p>You retain all ownership rights to the content you upload, publish, or store on the Services (&quot;Your Content&quot;). By using the Services, you grant Envosta a limited, non-exclusive license to host, store, transfer, and display Your Content solely as necessary to provide the Services to you.</p>
              <p><strong>Backups.</strong> While Envosta performs daily automated backups as part of the Services, you are ultimately responsible for maintaining your own backup copies of Your Content. Envosta is not liable for any loss of data.</p>
              <p><strong>Content responsibility.</strong> You are solely responsible for Your Content and for ensuring it complies with all applicable laws and these Terms. Envosta does not pre-screen or monitor content but reserves the right to remove or disable access to any content that violates these Terms.</p>
              <hr className="legal-divider" />

              <h2 id="ip">Intellectual Property</h2>
              <p>All intellectual property rights in the Services, including but not limited to the Envosta platform, website, branding, logos, documentation, and proprietary technology, are owned by Envosta or its licensors. Nothing in these Terms grants you any right, title, or interest in the Services beyond the limited right to use them in accordance with these Terms.</p>
              <p>You may not copy, modify, distribute, sell, or lease any part of the Services or included software. You may not reverse-engineer or attempt to extract the source code of the Services unless applicable law permits it.</p>
              <hr className="legal-divider" />

              <h2 id="uptime">Uptime &amp; Service Level Agreement</h2>
              <p>Envosta commits to a <strong>99.99% uptime guarantee</strong> for all hosting plans, measured on a monthly basis. Uptime is calculated as the percentage of total minutes in a calendar month during which the Services are available, excluding scheduled maintenance windows.</p>
              <p><strong>Scheduled maintenance.</strong> Envosta will provide at least 48 hours advance notice for planned maintenance that may affect availability. Scheduled maintenance windows are excluded from uptime calculations.</p>
              <p><strong>Service credits.</strong> If we fail to meet the 99.99% uptime commitment in any given month, you may be eligible for service credits as follows:</p>
              <ul>
                <li><strong>99.0% – 99.99% uptime:</strong> 10% credit of your monthly fee</li>
                <li><strong>95.0% – 99.0% uptime:</strong> 25% credit of your monthly fee</li>
                <li><strong>Below 95.0% uptime:</strong> 50% credit of your monthly fee</li>
              </ul>
              <p>Service credits must be requested within 30 days of the incident and are applied to future billing. Credits are the sole and exclusive remedy for any failure to meet the uptime commitment.</p>
              <hr className="legal-divider" />

              <h2 id="support">Support &amp; Maintenance</h2>
              <p>All plans include access to Envosta&apos;s technical support team. The scope and response times of support vary by plan:</p>
              <ul>
                <li><strong>Minimum plan:</strong> Email support during business hours</li>
                <li><strong>Growth plan:</strong> Email support with faster response times</li>
                <li><strong>Performance plan:</strong> Priority support with a dedicated account manager</li>
              </ul>
              <p>Support covers issues related to the hosting environment, server configuration, WordPress core, and Envosta-managed services. Support does not extend to custom code, third-party plugin conflicts, or website design and development unless you have an active design or maintenance add-on.</p>
              <p>Envosta performs regular platform maintenance, including WordPress core updates, PHP version management, and security patching. These updates are applied automatically and are included in all plans.</p>
              <hr className="legal-divider" />

              <h2 id="termination">Termination</h2>
              <p><strong>By you.</strong> You may cancel your account at any time through your account dashboard or by contacting support. Upon cancellation, your account will remain active until the end of your current billing period. After that, your data will be retained for 30 days before permanent deletion.</p>
              <p><strong>By Envosta.</strong> Envosta may suspend or terminate your account at any time if you violate these Terms, fail to pay outstanding fees, or engage in conduct that Envosta reasonably determines is harmful to the Services, other users, or Envosta&apos;s reputation.</p>
              <p><strong>Effect of termination.</strong> Upon termination, your right to use the Services immediately ceases. Envosta will make commercially reasonable efforts to allow you to export Your Content for 30 days following termination, except in cases of termination for cause (such as legal violations or abuse).</p>
              <hr className="legal-divider" />

              <h2 id="liability">Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Envosta and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, business opportunities, or goodwill, arising out of or in connection with your use of the Services.</p>
              <p>Envosta&apos;s total aggregate liability for any claims arising out of or related to these Terms or the Services shall not exceed the total amount paid by you to Envosta in the twelve (12) months preceding the claim.</p>
              <p>The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis. Envosta makes no warranties, express or implied, regarding the Services, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
              <hr className="legal-divider" />

              <h2 id="indemnification">Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless Envosta, its affiliates, and their respective officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys&apos; fees) arising out of or in connection with:</p>
              <ul>
                <li>Your use of the Services</li>
                <li>Your Content or any content hosted on your account</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any applicable law or regulation</li>
                <li>Any third-party claims resulting from your use of the Services</li>
              </ul>
              <hr className="legal-divider" />

              <h2 id="privacy">Privacy</h2>
              <p>Your use of the Services is also governed by our <a href="https://envosta.com/legal/privacy">Privacy Policy</a>, which describes how we collect, use, store, and protect your personal information. By using the Services, you acknowledge that you have read and understood our Privacy Policy.</p>
              <p>Envosta complies with applicable data protection laws, including GDPR for users in the European Economic Area and PIPEDA for users in Canada. For details on data processing, data transfers, and your rights, please refer to our Privacy Policy.</p>
              <hr className="legal-divider" />

              <h2 id="modifications">Modifications to Terms</h2>
              <p>Envosta reserves the right to update or modify these Terms at any time. When we make material changes, we will notify you by posting the updated Terms on our website and, where possible, by sending an email notification to the address associated with your account.</p>
              <p>Changes become effective on the date indicated at the top of the updated Terms. Your continued use of the Services after any changes take effect constitutes your acceptance of the revised Terms. If you do not agree with the revised Terms, you must discontinue your use of the Services.</p>
              <hr className="legal-divider" />

              <h2 id="governing">Governing Law &amp; Disputes</h2>
              <p>These Terms shall be governed by and construed in accordance with the laws of the Province of Alberta, Canada, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Calgary, Alberta, Canada.</p>
              <p><strong>Dispute resolution.</strong> Before filing any legal claim, you agree to first attempt to resolve the dispute informally by contacting Envosta at <a href="mailto:legal@envosta.com">legal@envosta.com</a>. We will attempt to resolve the dispute within 30 days. If the dispute is not resolved informally, either party may pursue formal legal proceedings.</p>
              <p><strong>Class action waiver.</strong> You agree that any dispute resolution proceedings will be conducted on an individual basis and not in a class, consolidated, or representative action.</p>
              <hr className="legal-divider" />

              <h2 id="contact">Contact Information</h2>
              <p>If you have any questions about these Terms of Service, please contact us:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:legal@envosta.com">legal@envosta.com</a></li>
                <li><strong>Support:</strong> <a href="https://envosta.com/support">envosta.com/support</a></li>
                <li><strong>Mailing address:</strong> Envosta Inc., Calgary, Alberta, Canada</li>
              </ul>
              <hr className="legal-divider" />

              <h2 id="domain-registration" style={{ marginTop: 48 }}>Appendix A &mdash; Domain Registration Agreement</h2>
              <p>The following Master Domain Registration Agreement applies to all domain names registered through Envosta. By registering a domain name through our Services, you agree to be bound by the terms below in addition to Envosta&apos;s Terms of Service above.</p>
              <hr className="legal-divider" />

              <h3>Master Domain Registration Agreement</h3>
              <p>This Registration Agreement (&quot;Agreement&quot;) is between Tucows Domains Inc. (&quot;Tucows&quot;) and you, on behalf of yourself or the entity you represent (&quot;Registrant&quot;), as offered through Envosta Inc., the Reseller participating in Tucows&apos; distribution channel for domain name registrations. Any reference to &quot;Registry&quot; or &quot;Registry Operator&quot; shall refer to the registry administrator of the applicable top-level domain (&quot;TLD&quot;). This Agreement explains Tucows&apos; obligations to Registrant, and Registrant&apos;s obligations to Tucows, for the domain registration services. By agreeing to the terms and conditions set forth in this Agreement, Registrant agrees to be bound by the rules and regulations set forth in this Agreement, and by a registry for that particular TLD.</p>

              <h4>Domain Name Registration</h4>
              <p>Domain name registrations are for a limited term, which ends on the expiration date communicated to the Registrant. A domain name submitted through Tucows will be deemed active when the relevant registry accepts the Registrant&apos;s application and activates Registrant&apos;s domain name registration or renewal. Tucows cannot guarantee that Registrant will obtain a desired domain name, even if an inquiry indicates that a domain name is available at the time of application. Tucows is not responsible for any inaccuracies or errors in the domain name registration or renewal process.</p>

              <h4>Fees</h4>
              <p>Registrant agrees to pay Reseller the applicable service fees prior to the registration or renewal of a domain. All fees payable hereunder are non-refundable even if Registrant&apos;s domain name registration is suspended, cancelled or transferred prior to the end of your current registration term. Tucows bills in United States dollars and is not responsible for any change in price due to exchange rates.</p>

              <h4>Term</h4>
              <p>This Agreement will remain in effect during the term of the domain name registration as selected, recorded and paid for at the time of registration or renewal. Should the domain name be transferred to another registrar, the terms and conditions of this Agreement shall cease.</p>

              <h4>Selection of a Domain Name</h4>
              <p>You acknowledge and agree that we cannot guarantee that you will obtain a desired domain name, even if an inquiry indicates that the domain name is available at the time of your application. You represent that, to the best of your knowledge and belief, neither the registration of the domain name nor the manner in which you intend to use it, infringes upon the legal rights of a third party and further, that the domain name is not being registered for, nor shall it at any time whatsoever be used for, any unlawful purpose.</p>

              <h4>Expiration, Renewal, and Forfeiture</h4>
              <p>The registered domain name will expire on the expiration date specified in the registration term. Registrant will receive reminders prior to the expiration inviting Registrant to renew the domain name. In the event that Registrant fails to renew the domain name in a timely fashion, the registration will expire and Tucows may, at its discretion, elect to assume the registration and may hold it in its own account, delete it, or sell it to a third party. Registrant acknowledges and agrees that Registrant&apos;s right and interest in a domain name ceases upon its expiration. If Tucows elects to renew the registration, Registrant will be entitled to a grace period of forty (40) days during which Registrant may re-register the domain name. Additional costs for the redemption and re-registration will apply.</p>

              <h4>Expired Registration Recovery Policy</h4>
              <p>Domain expiration notices will be sent via email thirty (30) days and five (5) days prior to a domain expiration date and three (3) days after a domain expires. Renewal, post-expiration renewal and redemption fees are published at <a href="https://opensrs.com/services/domains/domain-pricing/" target="_blank" rel="noopener noreferrer">opensrs.com</a>. Reseller&apos;s fees may differ.</p>

              <h4>Registrant Information and Data Sharing</h4>
              <p>Data required for the registration of a domain name varies by top-level domain. The required data (&quot;Minimum Data&quot;) will be presented at the time of registration or renewal and may include: name and postal address of the Registered Name Holder; registered name; names of nameservers; and name, postal address, email address, and telephone numbers of administrative, billing, and technical contacts. The Minimum Data will be shared with Tucows and the relevant authoritative registry services provider for your top-level domain.</p>

              <h4>Accurate Information</h4>
              <p>Registrant represents and warrants that: statements made in connection with domain name registration are complete and accurate; Registrant information will be kept current; Registrant will not permit others to use the domain name in violation of any ICANN or registry policies, applicable laws or regulations, or legal rights of others; and Registrant will respond to inquiries concerning the accuracy of contact details. A breach of this section constitutes a material breach entitling Tucows or a registry to terminate this Agreement immediately without refund or notice.</p>

              <h4>Suspension and Cancellation</h4>
              <p>Tucows may suspend or cancel Registrant&apos;s domain name registration if Registrant breaches this Agreement; fails to provide payment or accurate information; as required by ICANN or a Registry Operator; to protect the integrity of Tucows and any applicable registry; to comply with applicable laws, government rules, or court orders; in compliance with any dispute resolution process; to combat DNS Abuse; or to avoid any liability. Upon cancellation, you will not receive a refund for any fees already paid.</p>

              <h4>Dispute Resolution</h4>
              <p>Registrant is bound by all ICANN consensus policies and all policies of any relevant Registry Operator, including the Uniform Rapid Suspension Procedure and the Uniform Domain Name Dispute Resolution Policy (UDRP). If a third party challenges the registration of the Registrant&apos;s domain name, Registrant will be subject to the provisions specified in the dispute policy adopted by the applicable registry and will indemnify and hold Tucows harmless.</p>

              <h4>WHOIS Privacy Service</h4>
              <p>If Registrant elects to use the WHOIS privacy registration service: the publicly available Registrant contact information will list Contact Privacy Inc. as the Registrant with Tucows&apos; contact information; Registrant retains complete control over the domain name; and Tucows shall have the right to suspend the privacy service and reveal Registrant information when required by law, to comply with legal process, to resolve third party claims, or if Tucows believes the service is being used to conceal involvement with illegal activities.</p>

              <h4>Transfer of Ownership</h4>
              <p>The person named as Registrant on record shall be the &quot;Registered Name Holder.&quot; Prior to transferring ownership to another person (the &quot;Transferee&quot;), Registrant shall require the Transferee to agree in writing to be bound by all terms of this Agreement. Registrant explicitly authorizes Tucows to act as their Designated Agent, as stipulated by the ICANN Transfer Policy, to approve a Change of Registrant on their behalf.</p>

              <h4>Limitation of Liability</h4>
              <p>Registrant agrees that Tucows&apos; entire liability, and Registrant&apos;s exclusive remedy, is solely limited to the amount Registrant paid for the initial registration of the domain name. Tucows, ICANN and the applicable registries shall not be liable for any lost profits, revenues, or data, financial losses or indirect, special, consequential, exemplary, or punitive damages.</p>

              <h4>Indemnity</h4>
              <p>Registrant will defend, indemnify, and hold harmless Tucows, ICANN, the applicable registries, and their respective directors, officers, employees, agents, affiliates, and contractors, from all liabilities, claims and expenses arising out of or relating to Registrant&apos;s registration and use of the domain name, use in violation of this Agreement, or violation of any third party right. This indemnification obligation survives the termination or expiration of this Agreement.</p>

              <h4>Governing Law</h4>
              <p>This Agreement shall be governed by and interpreted in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein. Any action relating to this Agreement must be brought in Ontario.</p>

              <h4>Privacy</h4>
              <p>Information collected about Registrant is subject to the terms of Tucows&apos; privacy policy at <a href="https://opensrs.com/privacy-policy/" target="_blank" rel="noopener noreferrer">opensrs.com/privacy-policy</a>.</p>

              <h4>TLD-Specific Provisions</h4>
              <p>Additional provisions apply to domain names registered with various registries. The complete list of TLD-specific provisions can be found at <a href="https://opensrs.com/docs/contracts/exhibita.htm" target="_blank" rel="noopener noreferrer">opensrs.com/docs/contracts/exhibita.htm</a>. These provisions are explicitly incorporated herein by reference.</p>

              <h4>Acceptance</h4>
              <p>By registering a domain name through Envosta, you acknowledge that you have read this Domain Registration Agreement and agree to all its terms and conditions. You have independently evaluated the desirability of the service and are not relying on any representation, agreement, guarantee, or statement other than as set forth in this Agreement.</p>

            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
