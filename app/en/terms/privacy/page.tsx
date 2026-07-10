'use client'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-emerald-100">Effective Date: August 29, 2024</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* CCPA Notice - Top Priority */}
        <div className="mb-12 bg-gradient-to-r from-emerald-900/50 to-teal-800/50 border-2 border-emerald-500 p-8 rounded-lg">
          <div className="flex items-start gap-6">
            <div className="text-emerald-400 text-5xl">🔒</div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-emerald-300 mb-4">California Privacy Rights (CCPA)</h3>
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                If you are a California resident, you have the right to opt out of the sale or sharing of your personal information.
              </p>
              <button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold px-8 py-4 rounded-lg transition-all text-lg shadow-lg">
                Do Not Sell or Share My Personal Information
              </button>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              1. Information Collection and Use
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-4">
              ARATA collects and processes personal information for the following purposes.
              The personal information we collect will not be used for any purpose other than those stated below,
              and we will obtain separate consent when the purpose of use changes.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-900 p-5 rounded-lg border-l-4 border-[#3E7A5A]">
                <p className="text-[#3E7A5A] font-semibold text-lg">→ Member registration and account management</p>
              </div>
              <div className="bg-gray-900 p-5 rounded-lg border-l-4 border-[#3E7A5A]">
                <p className="text-[#3E7A5A] font-semibold text-lg">→ Service provision and content delivery</p>
              </div>
              <div className="bg-gray-900 p-5 rounded-lg border-l-4 border-[#3E7A5A]">
                <p className="text-[#3E7A5A] font-semibold text-lg">→ Payment processing and billing</p>
              </div>
              <div className="bg-gray-900 p-5 rounded-lg border-l-4 border-[#3E7A5A]">
                <p className="text-[#3E7A5A] font-semibold text-lg">→ Customer support and complaint handling</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              2. Personal Information We Collect
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg">
                <h4 className="text-[#3E7A5A] font-bold text-xl mb-4">Required Information</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Email address</li>
                  <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Password (encrypted)</li>
                  <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Username/Nickname</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg">
                <h4 className="text-teal-400 font-bold text-xl mb-4">Identity Verification</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-teal-500">•</span> Name</li>
                  <li className="flex gap-2"><span className="text-teal-500">•</span> Date of birth</li>
                  <li className="flex gap-2"><span className="text-teal-500">•</span> Gender</li>
                  <li className="flex gap-2"><span className="text-teal-500">•</span> Phone number</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg">
                <h4 className="text-green-400 font-bold text-xl mb-4">Payment Services</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-green-500">•</span> Payment information (secured)</li>
                  <li className="flex gap-2"><span className="text-green-500">•</span> Billing address</li>
                  <li className="flex gap-2"><span className="text-green-500">•</span> Transaction history</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg">
                <h4 className="text-orange-400 font-bold text-xl mb-4">Auto-Collected</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-orange-500">•</span> IP address</li>
                  <li className="flex gap-2"><span className="text-orange-500">•</span> Cookies and tracking</li>
                  <li className="flex gap-2"><span className="text-orange-500">•</span> Usage logs</li>
                  <li className="flex gap-2"><span className="text-orange-500">•</span> Device information</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              3. Retention and Use Period
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              We retain personal information for the period required by law or as agreed upon when collecting your information.
            </p>
            <div className="bg-gray-900 p-6 rounded-lg space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-gray-700">
                <span className="text-white font-semibold text-lg">Account Information</span>
                <span className="text-[#3E7A5A] font-bold">Until account deletion</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-gray-700">
                <span className="text-white font-semibold text-lg">Payment Information</span>
                <span className="text-[#3E7A5A] font-bold">5 years (required by law)</span>
              </div>
              <div className="flex justify-between items-center py-4">
                <span className="text-white font-semibold text-lg">Service Usage Records</span>
                <span className="text-[#3E7A5A] font-bold">3 years (required by law)</span>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              4. Sharing Personal Information
            </h2>
            <div className="bg-green-900/20 border-2 border-green-500 p-8 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-green-400 text-5xl">✓</span>
                <h3 className="text-2xl font-bold text-green-400">We Do Not Sell Your Data</h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                We only share your personal information with third parties when required by law
                or with your explicit consent. <span className="text-green-400 font-bold">Your data is never sold to third parties.</span>
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              5. Your Rights
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              You have the following rights regarding your personal information:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '👁️', title: 'Right to Access', desc: 'Request access to your personal information' },
                { icon: '✏️', title: 'Right to Correction', desc: 'Request correction of inaccurate information' },
                { icon: '🗑️', title: 'Right to Deletion', desc: 'Request deletion of your information' },
                { icon: '⏸️', title: 'Right to Restriction', desc: 'Request restriction of processing' },
                { icon: '📦', title: 'Data Portability', desc: 'Request transfer of your data' },
                { icon: '🚫', title: 'Right to Object', desc: 'Object to data processing' }
              ].map((right, idx) => (
                <div key={idx} className="bg-gray-900 p-6 rounded-lg border-l-4 border-[#3E7A5A] hover:bg-gray-800 transition-colors">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{right.icon}</span>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-2">{right.title}</h4>
                      <p className="text-gray-400">{right.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              6. Data Security
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              We implement appropriate technical and organizational measures to protect your personal information.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: '🔐', title: 'Encryption', desc: 'All sensitive data encrypted in transit and at rest', color: 'blue' },
                { icon: '🛡️', title: 'Access Control', desc: 'Strict authentication and authorization', color: 'green' },
                { icon: '🔍', title: 'Monitoring', desc: 'Continuous security monitoring and audits', color: 'purple' },
                { icon: '🔄', title: 'Updates', desc: 'Regular security updates and patches', color: 'orange' }
              ].map((security, idx) => (
                <div key={idx} className={`bg-${security.color}-900/20 border border-${security.color}-500/50 p-6 rounded-lg`}>
                  <div className="text-4xl mb-3">{security.icon}</div>
                  <h4 className={`text-${security.color}-400 font-bold text-xl mb-2`}>{security.title}</h4>
                  <p className="text-gray-300">{security.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              7. Cookies and Tracking
            </h2>
            <div className="bg-amber-900/30 border border-amber-500/50 p-8 rounded-lg">
              <p className="text-gray-300 leading-relaxed text-lg mb-6">
                We use cookies to improve your user experience and analyze service usage.
                You can manage your cookie preferences at any time.
              </p>
              <button className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-lg transition-colors">
                Manage Cookie Preferences
              </button>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              8. Children's Privacy
            </h2>
            <div className="bg-red-900/20 border-2 border-red-500 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <span className="text-red-500 text-5xl">⚠️</span>
                <div>
                  <h3 className="text-2xl font-bold text-red-400 mb-3">Service Not For Children Under 13</h3>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    We do not knowingly collect personal information from children under 13.
                    If you believe we have collected information from a child, please contact us immediately.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9 - Contact */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              9. Privacy Officer Contact
            </h2>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-lg">
              <p className="text-gray-300 text-lg mb-6">
                For privacy-related inquiries or concerns, please contact:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="text-[#3E7A5A] text-4xl">📧</div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <a href="mailto:privacy@arata.co.kr" className="text-[#3E7A5A] hover:text-[#3E7A5A] transition-colors text-xl font-semibold">
                      privacy@arata.co.kr
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[#3E7A5A] text-4xl">⏰</div>
                  <div>
                    <p className="text-gray-400 text-sm">Business Hours</p>
                    <p className="text-white text-xl font-semibold">Weekdays 09:00-18:00 (KST)</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the
              "effective date" at the top. We encourage you to review this Privacy Policy periodically
              for any changes.
            </p>
          </section>
        </div>

        {/* Footer Notice */}
        <div className="mt-16 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-[#3E7A5A]/30 p-8 rounded-lg">
          <h3 className="text-2xl font-bold text-[#3E7A5A] mb-4">Important Notice</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              This Privacy Policy is effective as of August 29, 2024.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              By using our service, you agree to the collection and use of information in accordance with this policy.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              You can withdraw your consent at any time by deleting your account.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              We are committed to protecting your privacy and personal information.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
