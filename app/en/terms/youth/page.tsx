'use client'

export default function YouthProtectionPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">Youth Protection Policy</h1>
          <p className="text-xl text-emerald-100">Effective Date: August 29, 2024</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Important Notice for Parents */}
        <div className="mb-12 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-[#3E7A5A] p-8 rounded-lg">
          <div className="flex items-start gap-6">
            <div className="text-[#3E7A5A] text-5xl">👨‍👩‍👧‍👦</div>
            <div>
              <h3 className="text-3xl font-bold text-[#3E7A5A] mb-4">Parents Notice</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Please monitor your child's use of our service. We provide tools and controls to help
                ensure a safe experience for young users. Review our age verification and content
                restriction features below.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              1. Purpose
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              ARATA is committed to protecting minors and ensuring they can use our services
              safely. This Youth Protection Policy outlines our measures to restrict access
              to inappropriate content and protect minors' personal information in accordance
              with applicable laws and regulations.
            </p>
          </section>

          {/* Section 2 - Age Restrictions */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              2. Age Restrictions
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              We implement the following age restrictions to protect minors:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-red-900/30 border-2 border-red-500 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-red-400 text-5xl font-bold">18+</span>
                  <h4 className="text-2xl font-bold text-red-400">Adult Content</h4>
                </div>
                <p className="text-gray-300">
                  Access to mature content restricted to users 18 years and older through our age verification system.
                </p>
              </div>

              <div className="bg-blue-900/30 border-2 border-blue-500 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-blue-400 text-5xl">📊</span>
                  <h4 className="text-2xl font-bold text-blue-400">Rating System</h4>
                </div>
                <p className="text-gray-300">
                  All content clearly rated: All Ages, 13+, 16+, 18+
                </p>
              </div>

              <div className="bg-purple-900/30 border-2 border-purple-500 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-purple-400 text-5xl">🏷️</span>
                  <h4 className="text-2xl font-bold text-purple-400">Clear Labeling</h4>
                </div>
                <p className="text-gray-300">
                  Prominent 18+ badges displayed on all mature content
                </p>
              </div>

              <div className="bg-green-900/30 border-2 border-green-500 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-green-400 text-5xl">🛡️</span>
                  <h4 className="text-2xl font-bold text-green-400">Tech Protection</h4>
                </div>
                <p className="text-gray-300">
                  Content filtering and blocking systems to prevent underage access
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 - Parental Controls */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              3. Parental Controls
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              Parents and legal guardians have comprehensive control over their child's account:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '👁️', title: 'Access Info', desc: 'Review child\'s account activity' },
                { icon: '✏️', title: 'Modify Data', desc: 'Correct or delete information' },
                { icon: '📊', title: 'Monitor Usage', desc: 'Track service usage patterns' },
                { icon: '💳', title: 'Cancel Purchases', desc: 'Refund unauthorized payments' },
                { icon: '💰', title: 'Set Limits', desc: 'Control spending amounts' },
                { icon: '🚫', title: 'Content Restrict', desc: 'Block age-inappropriate content' }
              ].map((control, idx) => (
                <div key={idx} className="bg-gray-900 p-6 rounded-lg hover:bg-gray-800 transition-all border border-gray-700 hover:border-[#3E7A5A]">
                  <div className="text-5xl mb-4">{control.icon}</div>
                  <h4 className="text-[#3E7A5A] font-bold text-lg mb-2">{control.title}</h4>
                  <p className="text-gray-400 text-sm">{control.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 - Minor's Rights */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              4. Minor's Rights
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              Minors and their legal guardians have the right to:
            </p>
            <div className="bg-gray-900 p-6 rounded-lg space-y-4">
              {[
                'Access and review personal information collected',
                'Request correction of inaccurate information',
                'Request deletion of personal information at any time',
                'Request restriction of data processing',
                'Object to automated decision-making or profiling'
              ].map((right, idx) => (
                <div key={idx} className="flex items-start gap-4 py-3 border-b border-gray-800 last:border-0">
                  <span className="text-[#3E7A5A] text-2xl flex-shrink-0">✓</span>
                  <p className="text-gray-300 text-lg">{right}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5 - Children Under 13 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              5. Children Under 13
            </h2>
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 border-4 border-red-500 p-10 rounded-lg">
              <div className="flex items-start gap-6">
                <span className="text-red-400 text-7xl">🚫</span>
                <div>
                  <h3 className="text-3xl font-bold text-red-400 mb-4">Service Not For Children Under 13</h3>
                  <p className="text-gray-200 leading-relaxed text-lg mb-4">
                    Our service is not intended for children under 13 years of age.
                    We do not knowingly collect personal information from children under 13.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    If we become aware that we have collected personal information from a child
                    under 13 without proper parental consent, we will take immediate steps to delete
                    such information from our servers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 - Reporting */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              6. Reporting Inappropriate Content
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              If you encounter content that you believe is inappropriate for minors, please report it immediately:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-900 p-6 rounded-lg">
                <div className="text-[#3E7A5A] text-5xl mb-4">📧</div>
                <h4 className="text-white font-bold text-lg mb-2">Email Report</h4>
                <a href="mailto:report@arata.co.kr" className="text-[#3E7A5A] hover:text-[#3E7A5A] transition-colors">
                  report@arata.co.kr
                </a>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg">
                <div className="text-[#3E7A5A] text-5xl mb-4">🚨</div>
                <h4 className="text-white font-bold text-lg mb-2">In-App Reporting</h4>
                <p className="text-gray-400">Use the "Report" button on any content page</p>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg">
                <div className="text-[#3E7A5A] text-5xl mb-4">⏰</div>
                <h4 className="text-white font-bold text-lg mb-2">Response Time</h4>
                <p className="text-gray-400">We review all reports within 24 hours</p>
              </div>
            </div>
          </section>

          {/* Section 7 - Education */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              7. Education and Awareness
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              We provide educational resources to help minors and parents:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: '📚', title: 'Content Rating Guide', desc: 'Understand our rating system', color: 'blue' },
                { icon: '🔒', title: 'Safe Internet', desc: 'Learn safe online practices', color: 'green' },
                { icon: '🚨', title: 'Report Guidelines', desc: 'How to report inappropriate content', color: 'red' },
                { icon: '🛡️', title: 'Privacy Tips', desc: 'Protect personal information', color: 'purple' }
              ].map((edu, idx) => (
                <div key={idx} className={`bg-${edu.color}-900/20 border border-${edu.color}-500/50 p-6 rounded-lg`}>
                  <div className="text-5xl mb-4">{edu.icon}</div>
                  <h4 className={`text-${edu.color}-400 font-bold text-xl mb-2`}>{edu.title}</h4>
                  <p className="text-gray-300">{edu.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 8 - Age Verification */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              8. Age Verification Methods
            </h2>
            <div className="bg-gray-900 p-8 rounded-lg">
              <p className="text-gray-300 text-lg mb-6">
                To access age-restricted content, users must complete age verification through:
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                  <span className="text-[#3E7A5A] text-3xl">1️⃣</span>
                  <div>
                    <h5 className="text-white font-semibold text-lg mb-1">Self-Declaration</h5>
                    <p className="text-gray-400">Date of birth confirmation</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                  <span className="text-[#3E7A5A] text-3xl">2️⃣</span>
                  <div>
                    <h5 className="text-white font-semibold text-lg mb-1">Payment Verification</h5>
                    <p className="text-gray-400">Credit card holders typically 18+</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                  <span className="text-[#3E7A5A] text-3xl">3️⃣</span>
                  <div>
                    <h5 className="text-white font-semibold text-lg mb-1">Additional Methods</h5>
                    <p className="text-gray-400">As required by local laws and regulations</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Parents Action Panel */}
        <div className="mt-16 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-4 border-[#3E7A5A] p-10 rounded-lg">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">👨‍👩‍👧</span>
            <h3 className="text-3xl font-bold text-[#3E7A5A]">Parents Action Panel</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Monitor your child\'s use of our service regularly',
              'Use parental control features to restrict access',
              'Report concerns about inappropriate content immediately',
              'Review purchases and set spending limits',
              'Talk to your children about safe online behavior',
              'Regularly check their activity and reading history'
            ].map((action, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-black/30 p-4 rounded-lg">
                <span className="text-[#3E7A5A] text-xl flex-shrink-0">→</span>
                <p className="text-gray-200">{action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Notice */}
        <div className="mt-16 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-[#3E7A5A]/30 p-8 rounded-lg">
          <h3 className="text-2xl font-bold text-[#3E7A5A] mb-4">Important Notice</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              This Youth Protection Policy is effective as of August 29, 2024.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              We continuously improve our protection measures for a safe environment.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              We are committed to full compliance with child protection laws.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              For questions, contact us at <a href="mailto:report@arata.co.kr" className="text-[#3E7A5A] hover:text-[#3E7A5A] underline">report@arata.co.kr</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
